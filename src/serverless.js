const { Component } = require('@serverless/core')
const { isEmpty, isNil, map, merge, mergeDeepRight, not, pick } = require('ramda')

const {
  createOrUpdateApiKeys,
  createOrUpdateDataSources,
  createOrUpdateFunctions,
  createOrUpdateGraphqlApi,
  createOrUpdateResolvers,
  createSchema,
  createServiceRole,
  getClients,
  removeGraphqlApi,
  removeObsoleteApiKeys,
  removeObsoleteDataSources,
  removeObsoleteFunctions,
  removeObsoleteResolvers,
  removeRole
} = require('./utils')

const defaults = {
  region: 'us-east-1'
}

class AwsAppSync extends Component {
  async deploy(inputs = {}) {
    const config = mergeDeepRight(merge(defaults, { apiId: this.state.apiId }), inputs)
    config.src = inputs.src
    const { appSync, iam } = getClients(this.credentials.aws, config.region)
    const graphqlApi = await createOrUpdateGraphqlApi(appSync, config, this)
    config.apiId = graphqlApi.apiId || config.apiId
    config.arn = graphqlApi.arn
    config.uris = graphqlApi.uris
    config.isApiCreator = isNil(inputs.apiId)
    config.roleArn = inputs.roleArn || this.state.roleArn
    config.policyArn = this.state.policyArn

    if (!config.roleArn) {
      const res = await createServiceRole(iam, config, this)
      config.roleArn = res.roleArn
      config.policyArn = res.policyArn
      this.state.roleArn = config.roleArn
      this.state.policyArn = config.policyArn
    }

    config.dataSources = map((datasource) => {
      if (isNil(datasource.serviceRoleArn)) {
        datasource.serviceRoleArn = config.roleArn
      }
      return datasource
    }, config.dataSources || [])

    config.dataSources = await createOrUpdateDataSources(appSync, config, this)
    config.schemaChecksum = await createSchema(appSync, config, this.state, this)
    config.mappingTemplates = await createOrUpdateResolvers(appSync, config, this)
    config.functions = await createOrUpdateFunctions(appSync, config, this)
    config.apiKeys = await createOrUpdateApiKeys(appSync, config, this.state, this)

    await removeObsoleteResolvers(appSync, config, this.state, this)
    await removeObsoleteFunctions(appSync, config, this.state, this)
    await removeObsoleteDataSources(appSync, config, this.state, this)
    await removeObsoleteApiKeys(appSync, config, this.state, this)

    this.state = pick(['arn', 'schemaChecksum', 'apiKeys', 'uris', 'roleArn', 'policyArn'], config)
    this.state.apiId = config.apiId
    this.state.isApiCreator = config.isApiCreator
    this.state.dataSources = map(pick(['name', 'type']), config.dataSources)
    this.state.mappingTemplates = map(pick(['type', 'field']), config.mappingTemplates)
    this.state.functions = map(pick(['name', 'dataSource', 'functionId']), config.functions) // deploy functions with same names is not possible

    let output = pick(['apiId', 'arn', 'uris'], config)

    // Eslam - temporarly output a single url
    output.url = output.uris.GRAPHQL
    delete output.uris

    // TODO: Add domain support back in

    if (not(isNil(config.apiKeys)) && not(isEmpty(config.apiKeys))) {
      output = merge(output, {
        apiKeys: map(({ id }) => id, config.apiKeys)
      })
    }

    return output
  }

  // eslint-disable-next-line no-unused-vars
  async remove(inputs = {}) {
    const config = mergeDeepRight(merge(defaults, { apiId: this.state.apiId }), inputs)
    const { appSync, iam } = getClients(this.credentials.aws, config.region)
    if (not(this.state.isApiCreator)) {
      console.log('Remove created resources from existing API without deleting the API.')
      await removeObsoleteResolvers(
        appSync,
        { apiId: this.state.apiId, mappingTemplates: [] },
        this.state
      )
      await removeObsoleteFunctions(
        appSync,
        { apiId: this.state.apiId, functions: [] },
        this.state
      )
      await removeObsoleteDataSources(
        appSync,
        { apiId: this.state.apiId, dataSources: [] },
        this.state
      )
      await removeObsoleteApiKeys(appSync, { apiId: this.state.apiId, apiKeys: [] })
    } else {
      console.log(`Removing AppSync API with ID ${this.state.apiId}.`)
      await removeGraphqlApi(appSync, { apiId: this.state.apiId })
    }

    if (this.state.roleArn) {
      console.log(`Removing policy with arn ${this.state.policyArn}.`)
      console.log(`Removing role with arn ${this.state.roleArn}.`)

      await removeRole(iam, this.state)
    }

    // TODO: Add domain support
    // const domain = await this.load('@serverless/domain', 'apiDomain')
    // await domain.remove()

    this.state = {}
  }
}

module.exports = AwsAppSync

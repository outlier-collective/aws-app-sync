const { Component } = require('@serverless/core')
const { mergeDeepRight, pick, map } = require('ramda')

const {
  getClients,
  createSchema,
  createOrUpdateGraphqlApi,
  createOrUpdateDataSources,
  createOrUpdateResolvers,
  createOrUpdateFunctions,
  removeObsoleteDataSources,
  removeObsoleteResolvers,
  removeObsoleteFunctions,
  deleteGraphqlApi
  // setupApiKey
} = require('./utils')

const defaults = {
  region: 'us-east-1'
}

class AwsAppSync extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    config.apiId = this.state.apiId
    const { appSync } = getClients(this.context.credentials.aws, config.region)
    const graphqlApi = await createOrUpdateGraphqlApi(appSync, config, this.context.debug)
    config.apiId = graphqlApi.apiId
    config.arn = graphqlApi.arn
    await createOrUpdateDataSources(appSync, config, this.context.debug)
    await createSchema(appSync, config, this.context.debug)
    await createOrUpdateResolvers(appSync, config, this.context.debug)
    await createOrUpdateFunctions(appSync, config, this.context.debug)
    // await setupApiKey(appSync, config, this.context.debug)

    await removeObsoleteDataSources(appSync, config, this.state, this.context.debug)
    await removeObsoleteResolvers(appSync, config, this.state, this.context.debug)
    await removeObsoleteFunctions(appSync, config, this.state, this.context.debug)

    this.state = pick(['apiId', 'arn'], config)
    this.state.dataSources = map(pick(['name', 'type']), config.dataSources)
    this.state.mappingTemplates = map(pick(['type', 'field']), config.mappingTemplates)
    this.state.functions = map(pick(['name', 'dataSource']), config.functions)
    await this.save()
    return { graphqlApi: pick(['apiId', 'arn'], config) }
  }

  // eslint-disable-next-line no-unused-vars
  async remove(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    const { appSync } = getClients(this.context.credentials.aws, config.region)
    await deleteGraphqlApi(appSync, { apiId: this.state.apiId })
    this.state = {}
    await this.save()
  }
}

module.exports = AwsAppSync

const { Component } = require('@serverless/core')
const lib = require('./lib')

class AwsAppSync extends Component {

  /**
   * Deploy
   * @param {*} inputs 
   */
  async deploy(inputs = {}) {

    console.log('Deploying AWS App Sync')

    // Merge inputs with defaults and state
    inputs.name = inputs.name || `app-sync-${lib.generateRandomId()}`
    inputs.apiId = inputs.apiId || this.state.apiId || null
    inputs.src = inputs.src || null
    inputs.authenticationType = inputs.authenticationType || 'API_KEY'
    inputs.apiKeys = inputs.apiKeys || []
    inputs.dataSources = inputs.dataSources || []
    inputs.mappingTemplates = inputs.mappingTemplates || []

    const { appSync, iam } = lib.getClients(this.credentials.aws, inputs.region)

    if (inputs.src) {
      console.log('Unzipping source files')
      inputs.src = await this.unzip(inputs.src, true) // Returns directory with unzipped files
    }

    console.log('Creating or updating your graphql API')
    const graphqlApi = await lib.createOrUpdateGraphqlApi(appSync, inputs)
    this.state.apiId = graphqlApi.apiId || inputs.apiId
    this.state.arn = graphqlApi.arn
    this.state.uris = graphqlApi.uris
    this.state.isApiCreator = inputs.apiId ? true : false
    this.state.region = inputs.region

    // If no AWS IAM Role is provided, auto-create one that gives access to all listed data sources
    if (!inputs.roleArn && !this.state.autoRoleArn) {
      console.log('No IAM Role provided.  Creating an IAM Role with access to all datasources')
      const res = await lib.createServiceRole(iam, inputs)
      this.state.autoRoleArn = res.roleArn
      this.state.autoPolicyArn = res.policyArn
    }

    inputs.dataSources.forEach((dataSource) => {
      if (dataSource.serviceRoleArn) return
      dataSource.serviceRoleArn = inputs.roleArn || this.state.autoRoleArn
    })

    const datasources = await lib.createOrUpdateDataSources(appSync, inputs)
    console.log(datasources)

    // inputs.dataSources = await createOrUpdateDataSources(appSync, inputs)
    // inputs.schemaChecksum = await createSchema(appSync, inputs, this.state)
    // inputs.mappingTemplates = await createOrUpdateResolvers(appSync, inputs)
    // inputs.functions = await createOrUpdateFunctions(appSync, inputs)
    // inputs.apiKeys = await createOrUpdateApiKeys(appSync, inputs, this.state)

    // await removeObsoleteResolvers(appSync, inputs, this.state)
    // await removeObsoleteFunctions(appSync, inputs, this.state)
    // await removeObsoleteDataSources(appSync, inputs, this.state)
    // await removeObsoleteApiKeys(appSync, inputs, this.state)

    // this.state = pick(['arn', 'schemaChecksum', 'apiKeys', 'uris', 'roleArn', 'policyArn', 'autoRoleArn', 'autoPolicyArn'], inputs)
    // this.state.apiId = inputs.apiId
    // this.state.isApiCreator = inputs.isApiCreator
    // this.state.dataSources = map(pick(['name', 'type']), inputs.dataSources)
    // this.state.mappingTemplates = map(pick(['type', 'field']), inputs.mappingTemplates)
    // this.state.functions = map(pick(['name', 'dataSource', 'functionId']), inputs.functions) // deploy functions with same names is not possible
    // console.log(this.state)

    // let output = pick(['apiId', 'arn', 'uris'], inputs)

    // // Eslam - temporarly output a single url
    // output.url = output.uris.GRAPHQL
    // delete output.uris

    // // TODO: Add domain support

    // if (not(isNil(inputs.apiKeys)) && not(isEmpty(inputs.apiKeys))) {
    //   output = merge(output, {
    //     apiKeys: map(({ id }) => id, inputs.apiKeys)
    //   })
    // }

    // return output
  }

  /**
   * Remove
   * @param {*} inputs 
   */
  async remove(inputs = {}) {
    const { appSync, iam } = lib.getClients(this.credentials.aws, this.state.region)
    if (!this.state.isApiCreator) {
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

    if (this.state.autoRoleArn) {
      console.log(`Removing policy with arn ${this.state.autoPolicyArn}.`)
      console.log(`Removing role with arn ${this.state.autoRoleArn}.`)
      await removeRole(iam, this.state)
    }

    this.state = {}
  }
}

module.exports = AwsAppSync

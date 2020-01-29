const { Component } = require('@serverless/core')
const lib = require('./lib')
const utils = require('./utils')

class AwsAppSync extends Component {

  /**
   * Deploy
   * @param {*} inputs 
   */
  async deploy(inputs = {}) {

    console.log('Deploying a graphql API via AWS App Sync...')

    // Merge inputs with defaults and state
    inputs.name = inputs.name || `app-sync-${lib.generateRandomId()}`
    inputs.src = inputs.src || null
    inputs.authenticationType = inputs.authenticationType || 'API_KEY'
    inputs.apiKeys = inputs.apiKeys || []
    inputs.dataSources = inputs.dataSources || []
    inputs.mappingTemplates = inputs.mappingTemplates || []
    // DO NOT MESS WITH THE APIID INPUT - This component will be designed to work with EXISTING APIs and extend them, as well as create NEW ones.  The "apiId" input is reserved for this future functionality.
    inputs.apiId = inputs.apiId || null
    if (inputs.apiId) { this.state.isApiCreator = false }

    // Instantiate SDKs
    const { appSync, iam } = utils.getClients(this.credentials.aws, inputs.region)

    // Unzip any source files, which might contain schema
    if (inputs.src) {
      console.log('Unzipping source files')
      inputs.src = await this.unzip(inputs.src, true) // Returns directory with unzipped files
    }

    // Create/update the core GraphQL API
    console.log('Creating or updating your graphql API')
    const graphqlApi = await lib.createOrUpdateGraphqlApi(appSync, inputs, this.state)
    this.state.apiId = graphqlApi.apiId || inputs.apiId
    this.state.arn = graphqlApi.arn
    this.state.uris = graphqlApi.uris
    this.state.isApiCreator = inputs.apiId ? false : true
    this.state.region = inputs.region

    // If no AWS IAM Role is provided, auto-create one that gives access to all listed data sources
    if (!inputs.roleArn) {
      console.log('No IAM Role provided.  Automatically creating an IAM Role with necessary permissions...')
      const res = await lib.createOrUpdateServiceRole(iam, inputs)
      this.state.autoRoleArn = res.role.Arn
      this.state.autoPolicyArn = res.policy.Arn
    }

    // Create, update, delete datasources
    const datasources = await lib.createUpdateOrDeleteDataSources(appSync, inputs, this.state)

    // Create, update schema
    this.state.schemaChecksum = await lib.processSchema(appSync, inputs, this.state)

    // Mapping Templates
    const mappingTemplates = await lib.createOrUpdateResolvers(appSync, inputs, this.state)

    inputs.apiKeys = await lib.createOrUpdateApiKeys(appSync, inputs, this.state)



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
    const { appSync, iam } = utils.getClients(this.credentials.aws, this.state.region)

    // If a role was auto-created, delete it
    if (this.state.autoRoleArn) {
      console.log(`Removing policy with arn ${this.state.autoPolicyArn}.`)
      console.log(`Removing role with arn ${this.state.autoRoleArn}.`)
      await lib.removeServiceRoleAndPolicy(iam, this.state.autoRoleArn, this.state.autoPolicyArn)
    }

    // Remove graphql api
    if (this.state.apiId) {
      console.log(`Removing AppSync API with ID ${this.state.apiId}.`)
      try {
        await appSync.deleteGraphqlApi({ apiId: this.state.apiId }).promise()
      } catch(error) {
        if (error.code !== 'NotFoundException') {
          throw error
        }
      }
    }

    this.state = {}
  }
}

module.exports = AwsAppSync

const { Component } = require('@serverless/core')
const { mergeDeepRight, pick, map } = require('ramda')

const {
  getClients,
  createOrUpdateGraphqlApi,
  createOrUpdateDataSources,
  removeChangedDataSources,
  createSchema,
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
    await removeChangedDataSources(appSync, config, this.state, this.context.debug)
    await createSchema(appSync, config, this.context.debug)
    // await setupApiKey(appSync, config, this.context.debug)
    this.state = pick(['apiId', 'arn'], config)
    this.state.dataSources = map(pick(['name', 'type']), config.dataSources)
    await this.save()
    return { graphqlApi: pick(['apiId', 'arn'], config) }
  }

  // eslint-disable-next-line no-unused-vars
  async remove(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    const { appSync } = getClients(this.context.credentials.aws, config.region)
    await deleteGraphqlApi(appSync, { apiId: this.state.apiId })
  }
}

module.exports = AwsAppSync

// create service role if not set
// create datasources
//

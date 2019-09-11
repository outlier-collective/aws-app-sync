const { Component, utils } = require('@serverless/core')
const { mergeDeepRight, pick } = require('ramda')

const {
  getClients,
  createOrUpdateGraphqlApi,
  createOrUpdateDataSources,
  setupApiKey
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
    // await setupApiKey(appSync, config, this.context.debug)
    this.state = pick(['apiId', 'arn'], config)
    await this.save()
    return { graphqlApi: pick(['apiId', 'arn'], config) }
  }

  async remove(inputs = {}) {}
}

module.exports = AwsAppSync

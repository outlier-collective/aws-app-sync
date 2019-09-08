const { Component, utils } = require('@serverless/core')
const { mergeDeepRight } = require('ramda')

const { getClients, createOrUpdateGraphqlApi } = require('./utils')

const defaults = {}

class AwsAppSync extends Component {
  async default(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    config.apiId = this.state.apiId
    const { appSync } = getClients(this.context.credentials.aws, config.region)
    const graphqlApi = await createOrUpdateGraphqlApi(appSync, config, this.context.debug)
    this.state.apiId = graphqlApi.apiId
    await this.save()
    return { graphqlApi: { arn: graphqlApi.arn, apiId: graphqlApi.apiId } }
  }

  async remove(inputs = {}) {}
}

module.exports = AwsAppSync

const { utils } = require('@serverless/core')
const AWS = require('aws-sdk')
const { equals, find, isNil, merge, not, pick } = require('ramda')

/**
 * Get AWS clients
 * @param {object} credentials
 * @param {string} region
 * @returns {object} AWS clients
 */
const getClients = (credentials, region = 'us-east-1') => {
  const appSync = new AWS.AppSync({ credentials, region })
  return {
    appSync
  }
}

/**
 * Create or update graphql api
 * @param {object} appSync
 * @param {object} config
 * @returns {object} - graphqlApi
 */
const createOrUpdateGraphqlApi = async (appSync, config, debug) => {
  const inputFields = ['name', 'authenticationType']
  const inputs = pick(inputFields, config)
  let graphqlApi
  if (config.apiId) {
    debug(`Fetching graphql API by API id '${config.apiId}'`)
    try {
      const response = await appSync.getGraphqlApi({ apiId: config.apiId }).promise()
      graphqlApi = response.graphqlApi
    } catch (error) {
      if (not(equals('NotFoundException', error.code))) {
        throw error
      }
      debug(`API id '${config.apiId}' not found`)
    }
  }

  if (isNil(graphqlApi)) {
    debug(`Fetching graphql API by API name '${config.name}'`)
    let nextToken
    do {
      let params = {}
      if (not(isNil(nextToken))) {
        params = {
          nextToken
        }
      }
      const response = await appSync.listGraphqlApis(params).promise()
      graphqlApi = find(({ name }) => equals(name, config.name), response.graphqlApis)
      nextToken = isNil(graphqlApi) ? response.nextToken : null
    } while (not(isNil(nextToken)))
  }

  if (isNil(graphqlApi)) {
    debug(`Create a new graphql API`)
    const response = await appSync.createGraphqlApi(inputs).promise()
    graphqlApi = response.graphqlApi
  } else if (not(equals(inputs, pick(inputFields, graphqlApi)))) {
    debug(`Update an existing graphql API`)
    const response = await appSync
      .updateGraphqlApi(merge(inputs, { apiId: config.apiId }))
      .promise()
    graphqlApi = response.graphqlApi
  }

  return graphqlApi
}

module.exports = {
  getClients,
  createOrUpdateGraphqlApi
}

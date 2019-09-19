const AWS = require('aws-sdk')
const { equals, find, isNil, merge, not, pick } = require('ramda')

const { listAll } = require('./lib')

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

const authentication = (authenticationType) => {
  switch (authenticationType) {
    case 'AMAZON_COGNITO_USER_POOLS':
      return 'userPoolConfig'
    case 'OPENID_CONNECT':
      return 'openIDConnectConfig'
  }
}

/**
 * Create or update graphql api
 * @param {object} appSync
 * @param {object} config
 * @returns {object} - graphqlApi
 */
const createOrUpdateGraphqlApi = async (appSync, config, debug) => {
  const inputFields = [
    'name',
    'authenticationType',
    authentication(config.authenticationType),
    'additionalAuthenticationProviders'
  ]
  const inputs = pick(inputFields, config)
  let graphqlApi
  if (config.apiId) {
    debug(`Fetching graphql API by API id ${config.apiId}`)
    try {
      const response = await appSync.getGraphqlApi({ apiId: config.apiId }).promise()
      // eslint-disable-next-line prefer-destructuring
      graphqlApi = response.graphqlApi
    } catch (error) {
      if (not(equals('NotFoundException', error.code))) {
        throw error
      }
      debug(`API id '${config.apiId}' not found`)
    }
  }

  if (isNil(graphqlApi)) {
    debug(`Fetching graphql API by API name ${config.name}`)
    graphqlApi = find(
      ({ name }) => equals(name, config.name),
      await listAll(appSync, 'listGraphqlApis', {}, 'graphqlApis')
    )
    if (not(isNil(graphqlApi))) {
      config.apiId = graphqlApi.apiId
    }
  }

  if (isNil(graphqlApi)) {
    debug('Creating a new graphql API')
    const response = await appSync.createGraphqlApi(inputs).promise()
    // eslint-disable-next-line prefer-destructuring
    graphqlApi = response.graphqlApi
  } else if (not(equals(inputs, pick(inputFields, graphqlApi)))) {
    debug(`Updating graphql API ${config.apiId}`)
    const response = await appSync
      .updateGraphqlApi(merge(inputs, { apiId: config.apiId }))
      .promise()
    // eslint-disable-next-line prefer-destructuring
    graphqlApi = response.graphqlApi
  }

  return graphqlApi
}

const deleteGraphqlApi = async (appSync, config) => {
  try {
    await appSync.deleteGraphqlApi({ apiId: config.apiId }).promise()
  } catch (error) {
    if (not(equals(error.code, 'NotFoundException'))) {
      throw error
    }
  }
}

// const setupApiKey = async (appSync, config, debug) => {
//   TODO - how to index api keys e.g. name or id
//   if (not(isEmpty(config.apiKeys))) {
//     debug(`Fetching api keys`)
//     let nextToken
//     const apiKeys = []
//     const deployedApiKeys = await listAll(
//       appSync,
//       'listApiKeys',
//       { apiId: config.apiId },
//       'apiKeys' // ?
//     )
//     await Promise.all(
//       map(async (apiKey) => {
//         console.log(apiKey)
//       }, config.apiKeys)
//     )
//     const isoDateRegex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
//   }
// }

module.exports = {
  getClients,
  createOrUpdateGraphqlApi,
  deleteGraphqlApi,
  ...require('./lib/datasources'),
  ...require('./lib/schema'),
  ...require('./lib/resolvers'),
  ...require('./lib/functions'),
  ...require('./lib/role')
  // setupApiKey
}

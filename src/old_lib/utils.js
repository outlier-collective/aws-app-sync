const AWS = require('aws-sdk')
const { clone, equals, find, isEmpty, isNil, map, merge, not, pick } = require('ramda')
const { listAll } = require('./lib')

/**
 * Generate a random ID
 */
const generateRandomId = () => {
  return Math.random()
  .toString(36)
  .substring(6)
}

/**
 * Get AWS clients
 * @param {object} credentials
 * @param {string} region
 * @returns {object} AWS clients
 */
const getClients = (credentials, region = 'us-east-1') => {
  const appSync = new AWS.AppSync({ credentials, region })
  const iam = new AWS.IAM({ credentials, region })
  return {
    appSync,
    iam
  }
}

/**
 * Authentication
 * @param {*} authenticationType 
 */
const authentication = (authenticationType) => {
  switch (authenticationType) {
    case 'AMAZON_COGNITO_USER_POOLS':
      return 'userPoolConfig'
    case 'OPENID_CONNECT':
      return 'openIDConnectConfig'
  }
}

/**
 * Open ID connect defaults
 * @param {*} config 
 */
const openIdConnectDefaults = (config) =>
  merge(
    {
      clientId: null,
      iatTTL: 0,
      authTTL: 0
    },
    config
  )

/**
 * User pool defaults
 * @param {*} config 
 */
const userPoolDefaults = (config) =>
  merge(
    {
      appIdClientRegex: null
    },
    config
  )

/**
 * Add Defaults
 * @param {*} inputs 
 */
const addDefaults = (inputs) => {
  if (inputs.openIDConnectConfig) {
    inputs.openIDConnectConfig = openIdConnectDefaults(inputs.openIDConnectConfig)
  } else if (inputs.userPoolConfig) {
    inputs.userPoolConfig = userPoolDefaults(inputs.userPoolConfig)
  }
  if (inputs.additionalAuthenticationProviders) {
    inputs.additionalAuthenticationProviders = map((additionalAuthenticationProvider) => {
      if (additionalAuthenticationProvider.openIDConnectConfig) {
        additionalAuthenticationProvider.openIDConnectConfig = openIdConnectDefaults(
          additionalAuthenticationProvider.openIDConnectConfig
        )
      } else if (additionalAuthenticationProvider.userPoolConfig) {
        additionalAuthenticationProvider.userPoolConfig = userPoolDefaults(
          additionalAuthenticationProvider.userPoolConfig
        )
      }
      return additionalAuthenticationProvider
    }, inputs.additionalAuthenticationProviders)
  }
  return inputs
}

/**
 * Create or update graphql api
 * @param {object} appSync
 * @param {object} config
 * @returns {object} - graphqlApi
 */
const createOrUpdateGraphqlApi = async (appSync, config) => {
  const inputFields = [
    'name',
    'authenticationType',
    authentication(config.authenticationType),
    'additionalAuthenticationProviders',
    'logConfig'
  ]
  const inputs = pick(inputFields, config)
  let graphqlApi

  if (apiId) {
    console.log(`Fetching graphql API by API id: ${apiId}`)
    try {
      const response = await appSync.getGraphqlApi({ apiId }).promise()
      // eslint-disable-next-line prefer-destructuring
      graphqlApi = response.graphqlApi
    } catch (error) {
      if (error.code !==not(equals('NotFoundException', error.code))) {
        throw error
      }
      console.log(`Could not find a graphql API with the ID: ${config.apiId}`)
    }
  }

  if (isNil(graphqlApi)) {
    console.log(`Fetching graphql API by API name: ${config.name}`)
    graphqlApi = find(
      ({ name }) => equals(name, config.name),
      await listAll(appSync, 'listGraphqlApis', {}, 'graphqlApis')
    )
    if (not(isNil(graphqlApi))) {
      config.apiId = graphqlApi.apiId
    } else {
      console.log(`Could not find a graphql API with the name: ${config.name}`)
    }
  }

  if (isNil(graphqlApi)) {
    console.log('Creating a new graphql API')
    const response = await appSync.createGraphqlApi(inputs).promise()
    // eslint-disable-next-line prefer-destructuring
    graphqlApi = response.graphqlApi
  } else if (
    not(equals(addDefaults(clone(inputs)), pick(inputFields, graphqlApi))) &&
    not(isEmpty(inputs))
  ) {
    console.log(`Updating graphql API with ID: ${config.apiId}`)
    const parameters = merge(pick(inputFields, graphqlApi), merge(inputs, { apiId: config.apiId }))
    const response = await appSync.updateGraphqlApi(parameters).promise()
    // eslint-disable-next-line prefer-destructuring
    graphqlApi = response.graphqlApi
  }

  return graphqlApi
}

/**
 * Remove a GraphQL API
 * @param {*} appSync 
 * @param {*} config 
 */
const removeGraphqlApi = async (appSync, config) => {
  if (not(isNil(config.apiId))) {
    try {
      await appSync.deleteGraphqlApi({ apiId: config.apiId }).promise()
    } catch (error) {
      if (not(equals(error.code, 'NotFoundException'))) {
        throw error
      }
    }
  }
}

module.exports = {
  generateRandomId,
  getClients,
  createOrUpdateGraphqlApi,
  removeGraphqlApi,
  ...require('./lib/datasources'),
  ...require('./lib/schema'),
  ...require('./lib/resolvers'),
  ...require('./lib/functions'),
  ...require('./lib/role'),
  ...require('./lib/apikeys')
}

/**
 * Create or update graphql api
 * @param {object} appSync
 * @param {object} config
 * @returns {object} - graphqlApi
 */
const createOrUpdateGraphqlApi = async (appSync, inputs) => {
  let graphqlApi

  if (inputs.apiId) {
    console.log(`Fetching graphql API by API id: ${inputs.apiId}`)
    try {
      const response = await appSync.getGraphqlApi({ apiId: inputs.apiId }).promise()
      graphqlApi = response.graphqlApi
    } catch (error) {
      if (error.code !== 'NotFoundException') {
        throw error
      }
      console.log(`Could not find a graphql API with the ID: ${inputs.apiId}`)
    }
  }

  if (!graphqlApi) {
    console.log(`Fetching graphql API by API name: ${inputs.name}`)
    const apis = await listGraphqlApis(appSync)
    apis.forEach((api) => {
      if (api.name === inputs.name) {
        graphqlApi = api
        apiId = graphqlApi.apiId
      }
    })
    if (!graphqlApi) {
      console.log(`Could not find a graphql API with the name: ${inputs.name}`)
    }
  }

  const params = {}
  params.name = inputs.name
  params.authenticationType = inputs.authenticationType
  if (inputs.authenticationType === 'AMAZON_COGNITO_USER_POOLS') params.userPoolConfig = inputs.userPoolConfig
  if (inputs.authenticationType === 'OPENID_CONNECT') params.openIDConnectConfig = inputs.openIDConnectConfig
  params.additionalAuthenticationProviders = inputs.additionalAuthenticationProviders || []
  if (inputs.logConfig) params.logConfig = inputs.logConfig
  if (inputs.tags) params.tags = inputs.tags

  if (!graphqlApi) {
    console.log('Creating a new graphql API')
    const response = await appSync.createGraphqlApi(params).promise()
    graphqlApi = response.graphqlApi
  } else {
    console.log(`Updating graphql API with ID: ${graphqlApi.apiId}`)
    params.apiId = graphqlApi.apiId
    const response = await appSync.updateGraphqlApi(params).promise()
    graphqlApi = response.graphqlApi
  }

  return graphqlApi
}

/**
 * List all GraphQL APIs
 * @param {*} appSync 
 */
const listGraphqlApis = async (appSync) => {
  let result = []
  let nextToken
  do {
    const params = {}
    if (nextToken) { params.nextToken = nextToken }
    const response = await appSync.listGraphqlApis(params).promise()
    result = result.concat(response.graphqlApis)
    nextToken = response.nextToken
  } while (nextToken)
  return result
}

/**
 * Exports
 */
module.exports = {
  createOrUpdateGraphqlApi,
  listGraphqlApis,
}
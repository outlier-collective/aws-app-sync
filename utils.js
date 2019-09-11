const { utils } = require('@serverless/core')
const AWS = require('aws-sdk')
const {
  equals,
  flatten,
  filter,
  concat,
  clone,
  find,
  includes,
  isEmpty,
  isNil,
  merge,
  not,
  pick,
  pickBy,
  map,
  forEach,
  pipe
} = require('ramda')

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
 * List all from appSync
 * @param {*} service
 * @param {*} command
 * @param {*} params
 */
const listAll = async (service, command, params, key) => {
  let result = []
  let nextToken
  do {
    const currentParams = clone(params)
    if (not(isNil(nextToken))) {
      currentParams.nextToken = nextToken
    }
    const response = await service[command](params).promise()
    result = concat(result, response[key])
    nextToken = response.nextToken
  } while (not(isNil(nextToken)))
  return result
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
    graphqlApi = find(
      ({ name }) => equals(name, config.name),
      await listAll(appSync, 'listGraphqlApis', {}, 'graphqlApis')
    )
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

const setupApiKey = async (appSync, config, debug) => {
  if (not(isEmpty(config.apiKeys))) {
    debug(`Fetching api keys`)
    let nextToken
    let apiKeys = []
    // do {
    //   let params = {
    //     apiId: config.apiId
    //   }
    //   if (not(isNil(nextToken))) {
    //     params.nextToken = nextToken
    //   }
    //   const response = await appSync.listApiKeys(params).promise()
    //   nextToken = response.nextToken
    // } while (not(isNil(nextToken)))

    const deployedApiKeys = await listAll(
      appSync,
      'listApiKeys',
      { apiId: config.apiId },
      'apiKeys' // ?
    )

    await Promise.all(
      map(async (apiKey) => {
        console.log(apiKey)
      }, config.apiKeys)
    )

    const isoDateRegex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
  }
}

const equalsByKeys = (keys, objA, objB) => equals(pick(keys, objA), pick(keys, objB))
const equalsByKeysExcluded = (keys, objA, objB) =>
  equals(
    pickBy((val, key) => not(includes(key, keys)), objA),
    pickBy((val, key) => not(includes(key, keys)), objB)
  )

const formatDataSource = (dataSource, region) => {
  let result = {
    name: dataSource.name,
    type: dataSource.type
  }
  const config = clone(dataSource.config)
  delete config.region
  result.description = dataSource.description || null
  switch (dataSource.type) {
    case 'AWS_LAMBDA':
      result = merge(result, {
        lambdaConfig: config
      })
      break
    case 'AMAZON_DYNAMODB':
      result = merge(result, {
        dynamodbConfig: config
      })
      result.dynamodbConfig.awsRegion = region
      result.dynamodbConfig.useCallerCredentials = config.useCallerCredentials || false
      break
    case 'AMAZON_ELASTICSEARCH':
      result = merge(result, {
        elasticsearchConfig: config
      })
      result.dynamodbConfig.awsRegion = region
      break
    default:
      break
  }

  return result
}

// {
//   apiId: 'STRING_VALUE', /* required */
//   name: 'STRING_VALUE', /* required */
//   type: AWS_LAMBDA | AMAZON_DYNAMODB | AMAZON_ELASTICSEARCH | NONE | HTTP | RELATIONAL_DATABASE, /* required */
//   description: 'STRING_VALUE',
//   dynamodbConfig: {
//     awsRegion: 'STRING_VALUE', /* required */
//     tableName: 'STRING_VALUE', /* required */
//     useCallerCredentials: true || false
//   },
//   elasticsearchConfig: {
//     awsRegion: 'STRING_VALUE', /* required */
//     endpoint: 'STRING_VALUE' /* required */
//   },
//   httpConfig: {
//     authorizationConfig: {
//       authorizationType: AWS_IAM, /* required */
//       awsIamConfig: {
//         signingRegion: 'STRING_VALUE',
//         signingServiceName: 'STRING_VALUE'
//       }
//     },
//     endpoint: 'STRING_VALUE'
//   },
//   lambdaConfig: {
//     lambdaFunctionArn: 'STRING_VALUE' /* required */
//   },
//   relationalDatabaseConfig: {
//     rdsHttpEndpointConfig: {
//       awsRegion: 'STRING_VALUE',
//       awsSecretStoreArn: 'STRING_VALUE',
//       databaseName: 'STRING_VALUE',
//       dbClusterIdentifier: 'STRING_VALUE',
//       schema: 'STRING_VALUE'
//     },
//     relationalDatabaseSourceType: RDS_HTTP_ENDPOINT
//   },
//   serviceRoleArn: 'STRING_VALUE'

const createOrUpdateDataSources = async (appSync, config, debug) => {
  const deployedDataSources = await listAll(
    appSync,
    'listDataSources',
    { apiId: config.apiId },
    'dataSources'
  )

  const dataSourcesToDeploy = pipe(
    map((dataSource) =>
      merge(formatDataSource(dataSource, dataSource.config.region || config.region), {
        apiId: config.apiId,
        serviceRoleArn: dataSource.serviceRoleArn
      })
    ),
    filter((dataSource) => {
      const deployedDataSource = find(
        (deployedDataSource) => equals(deployedDataSource.name, dataSource.name),
        deployedDataSources
      )
      return not(equalsByKeysExcluded(['dataSourceArn', 'apiId'], deployedDataSource, dataSource))
    })
  )(config.dataSources)

  await Promise.all(
    map(async (dataSource) => appSync.createDataSource(dataSource).promise(), dataSourcesToDeploy)
  )
}

module.exports = {
  getClients,
  createOrUpdateGraphqlApi,
  createOrUpdateDataSources,
  setupApiKey
}

const { clone, difference, equals, find, isNil, map, merge, not, pick } = require('ramda')

const {
  equalsByKeysExcluded,
} = require('./utils')

/**
 * Create or update data sources
 * @param {Object} appSync
 * @param {Object} config
 * @return {Object} - deployed data sources
 */
const createOrUpdateDataSources = async (appSync, inputs) => {

  // List all datasources
  let result = []
  let nextToken
  do {
    const params = {}
    if (nextToken) { params.nextToken = nextToken }
    const response = await appSync.listDataSources({ apiId: inputs.apiId }).promise()
    result = result.concat(response.graphqlApis)
    nextToken = response.nextToken
  } while (nextToken)
  const deployedDataSources = result
  
  const dataSourcesToDeploy = map((dataSource) => {
    const formattedDataSource = merge(
      formatDataSource(dataSource, dataSource.config.region || inputs.region),
      {
        apiId: inputs.apiId,
        serviceRoleArn: dataSource.serviceRoleArn
      }
    )
    let deployedDataSource
    deployedDataSources.forEach((d) => {

    })
    
    
    
    find(
      ({ name }) => equals(name, dataSource.name),
      deployedDataSources
    )
    const dataSourcesEquals = isNil(deployedDataSource)
      ? false
      : equalsByKeysExcluded(
          ['dataSourceArn', 'apiId', 'description'],
          deployedDataSource,
          formattedDataSource
        )
    const mode = not(dataSourcesEquals) ? (not(deployedDataSource) ? 'create' : 'update') : 'ignore'
    return merge(formattedDataSource, { mode })
  }, inputs.dataSources)

  return await Promise.all(
    map(async (dataSource) => {
      const params = pickExcluded(['mode'], dataSource)
      if (equals(dataSource.mode, 'create')) {
        console.log(`Creating data source ${params.name}`)
        await appSync.createDataSource(params).promise()
      } else if (equals(dataSource.mode, 'update')) {
        console.log(`Updating data source ${params.name}`)
        await appSync.updateDataSource(params).promise()
      }
      return Promise.resolve(dataSource)
    }, dataSourcesToDeploy)
  )
}

/**
 * Format data source
 * @param {Object} dataSource
 * @param {String} region
 * @returns {Object} - Formatted data source
 */
const formatDataSource = (dataSource, region) => {
  let result = {
    name: dataSource.name,
    type: dataSource.type
  }
  const config = clone(dataSource.config)
  delete config.region // delete because awsRegion is used in the datasource configs...
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
      result.dynamodbConfig.useCallerCredentials = !!config.useCallerCredentials
      break
    case 'AMAZON_ELASTICSEARCH':
      result = merge(result, {
        elasticsearchConfig: config
      })
      result.elasticsearchConfig.awsRegion = region
      break
    case 'HTTP':
      result = merge(result, {
        httpConfig: config
      })
      break
    case 'RELATIONAL_DATABASE':
      result = merge(result, {
        relationalDatabaseConfig: {
          rdsHttpEndpointConfig: config,
          relationalDatabaseSourceType: 'RDS_HTTP_ENDPOINT'
        }
      })
      result.relationalDatabaseConfig.rdsHttpEndpointConfig.awsRegion = region
      break
    default:
      break
  }

  return result
}

/**
 * Remove obsolete data sources
 * @param {Object} appSync
 * @param {Object} inputs
 * @param {Object} state
 * @param {Function} debug
 */
const removeObsoleteDataSources = async (appSync, inputs, state, instance) => {
  const obsoleteDataSources = difference(
    defaultToAnArray(state.dataSources),
    map(pick(['name', 'type']), defaultToAnArray(inputs.dataSources))
  )
  await Promise.all(
    map(async ({ name }) => {
      console.log(`Removing data source ${name}`)
      try {
        await appSync.deleteDataSource({ apiId: inputs.apiId, name }).promise()
      } catch (error) {
        if (not(equals(error.code, 'NotFoundException'))) {
          throw error
        }
        console.log(`Data source ${name} already removed`)
      }
    }, obsoleteDataSources)
  )
}

module.exports = {
  createOrUpdateDataSources,
  removeObsoleteDataSources
}

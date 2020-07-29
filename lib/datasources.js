const { clone, difference, equals, find, isNil, map, merge, not, pick } = require('ramda')

const {
  equalsByKeysExcluded,
  listAll,
  pickExcluded,
  defaultToAnArray,
  checkForDuplicates
} = require('.')

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
 * Create or update data sources
 * @param {Object} appSync
 * @param {Object} config
 * @param {Function} debug
 * @return {Object} - deployed data sources
 */
const createOrUpdateDataSources = async (appSync, config, debug) => {
  checkForDuplicates(['name', 'type'], defaultToAnArray(config.dataSources))
  const deployedDataSources = await listAll(
    appSync,
    'listDataSources',
    { apiId: config.apiId },
    'dataSources'
  )

  const dataSourcesToDeploy = map((dataSource) => {
    const formattedDataSource = merge(
      formatDataSource(dataSource, dataSource.config.region || config.region),
      {
        apiId: config.apiId,
        serviceRoleArn: dataSource.serviceRoleArn
      }
    )
    const deployedDataSource = find(
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
  }, defaultToAnArray(config.dataSources))

  const res = []
  for (const dataSource of dataSourcesToDeploy) {
    const params = pickExcluded(['mode'], dataSource)
    if (equals(dataSource.mode, 'create')) {
      debug(`Creating data source ${params.name}`)
      await appSync.createDataSource(params).promise()
    } else if (equals(dataSource.mode, 'update')) {
      debug(`Updating data source ${params.name}`)
      await appSync.updateDataSource(params).promise()
    }
    res.push(dataSource)
  }
  return res
}

/**
 * Remove obsolete data sources
 * @param {Object} appSync
 * @param {Object} config
 * @param {Object} state
 * @param {Function} debug
 */
const removeObsoleteDataSources = async (appSync, config, state, debug) => {
  const obsoleteDataSources = difference(
    defaultToAnArray(state.dataSources),
    map(pick(['name', 'type']), defaultToAnArray(config.dataSources))
  )
  for (const dataSource of obsoleteDataSources) {
    debug(`Removing data source ${dataSource.name}`)
    try {
      await appSync.deleteDataSource({ apiId: config.apiId, name: dataSource.name }).promise()
    } catch (error) {
      if (not(equals(error.code, 'NotFoundException'))) {
        throw error
      }
      debug(`Data source ${dataSource.name} already removed`)
    }
  }
}

module.exports = {
  createOrUpdateDataSources,
  removeObsoleteDataSources
}

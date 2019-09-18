const { difference, equals, clone, find, isNil, merge, not, pick, map } = require('ramda')

const { equalsByKeysExcluded, listAll, pickExcluded, defaultToAnArray } = require('.')

/**
 * Format data source
 * @param {*} dataSource
 * @param {*} region
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
      result.dynamodbConfig.awsRegion = region
      break
    case 'HTTP':
      result = merge(result, {
        httpConfig: config
      })
      break
    case 'RELATIONAL_DATABASE':
      result = merge(result, {
        relationalDatabaseConfig: {
          rdsHttpEndpointConfig: config
        },
        relationalDatabaseSourceType: 'RDS_HTTP_ENDPOINT'
      })
      result.relationalDatabaseConfig.rdsHttpEndpointConfig.awsRegion = region
      break
    default:
      break
  }

  return result
}

const createOrUpdateDataSources = async (appSync, config, debug) => {
  debug('create or update')
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
      : not(
          equalsByKeysExcluded(
            ['dataSourceArn', 'apiId', 'description'],
            deployedDataSource,
            dataSource
          )
        )
    const mode = not(dataSourcesEquals) ? (not(deployedDataSource) ? 'create' : 'update') : 'ignore'
    return merge(formattedDataSource, { mode })
  }, config.dataSources)

  return await Promise.all(
    map(async (dataSource) => {
      const params = pickExcluded(['mode'], dataSource)
      if (equals(dataSource.mode, 'create')) {
        await appSync.createDataSource(params).promise()
      } else if (equals(dataSource.mode, 'update')) {
        await appSync.updateDataSource(params).promise()
      }
      return Promise.resolve(dataSource)
    }, dataSourcesToDeploy)
  )
}

/**
 * Remove changed data sources
 * @param {*} appSync
 * @param {*} config
 * @param {*} state
 * @param {*} debug
 */
const removeObsoleteDataSources = async (appSync, config, state, debug) => {
  debug('remove changed data sources')
  const changedDataSources = difference(
    defaultToAnArray(state.dataSources),
    map(pick(['name', 'type']), defaultToAnArray(config.dataSources))
  )
  await Promise.all(
    map(async ({ name }) => {
      try {
        await appSync.deleteDataSource({ apiId: config.apiId, name }).promise()
      } catch (error) {
        if (not(equals(error.code, 'NotFoundException'))) {
          throw error
        }
      }
    }, changedDataSources)
  )
}

module.exports = {
  createOrUpdateDataSources,
  removeObsoleteDataSources
}

const { difference, equals, find, isNil, merge, not, pick, map } = require('ramda')

const { equalsByKeys, listAll, defaultToAnArray } = require('.')
const { utils } = require('@serverless/core')

const createOrUpdateFunctions = async (appSync, config, debug) => {
  debug('Create or update functions')
  const deployedFunctions = await listAll(
    appSync,
    'listFunctions',
    { apiId: config.apiId },
    'functions'
  )

  const functionsWithTemplates = await Promise.all(
    map(async (func) => {
      let { requestMappingTemplate } = func
      if (isNil(requestMappingTemplate)) {
        requestMappingTemplate = await utils.readFile(func.request)
      }
      let { responseMappingTemplate } = func
      if (isNil(responseMappingTemplate)) {
        responseMappingTemplate = await utils.readFile(func.response)
      }
      return merge(func, {
        requestMappingTemplate,
        responseMappingTemplate,
        dataSourceName: func.dataSource
      })
    }, config.functions)
  )

  const functionsToDeploy = map((func) => {
    const deployedFunction = find(
      ({ name, dataSourceName }) =>
        equals(name, func.name) && equals(dataSourceName, func.dataSourceName),
      deployedFunctions
    )
    const functionEquals = isNil(deployedFunction)
      ? false
      : equalsByKeys(
          ['dataSourceName', 'name', 'responseMappingTemplate', 'requestMappingTemplate'],
          deployedFunction,
          func
        )
    const mode = not(functionEquals) ? (not(deployedFunction) ? 'create' : 'update') : 'ignore'
    return merge(func, {
      mode,
      functionId: deployedFunction ? deployedFunction.functionId : undefined
    })
  }, functionsWithTemplates)

  return Promise.all(
    map(async (func) => {
      const params = {
        apiId: config.apiId,
        name: func.name,
        requestMappingTemplate: func.requestMappingTemplate,
        responseMappingTemplate: func.responseMappingTemplate,
        functionVersion: func.functionVersion || '2018-05-29',
        dataSourceName: func.dataSource,
        description: func.description
      }
      if (equals(func.mode, 'create')) {
        const { functionConfiguration } = await appSync.createFunction(params).promise()
        func.functionId = functionConfiguration.functionId
      } else if (equals(func.mode, 'update')) {
        await appSync.updateFunction(merge(params, { functionId: func.functionId })).promise()
      }
      return Promise.resolve(func)
    }, functionsToDeploy)
  )
}

const removeObsoleteFunctions = async (appSync, config, state, debug) => {
  debug('remove obsolete functions')
  const obsoleteFunctions = difference(
    map(pick(['name', 'dataSource']), defaultToAnArray(state.functions)),
    map(pick(['name', 'dataSource']), defaultToAnArray(config.functions))
  )
  await Promise.all(
    map(async (func) => {
      try {
        await appSync
          .deleteFunction({
            apiId: config.apiId,
            functionId: func.functionId
          })
          .promise()
      } catch (error) {
        if (not(equals(error.code, 'NotFoundException'))) {
          throw error
        }
      }
    }, obsoleteFunctions)
  )
}

module.exports = {
  createOrUpdateFunctions,
  removeObsoleteFunctions
}

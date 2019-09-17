const {
  difference,
  equals,
  filter,
  clone,
  find,
  isNil,
  merge,
  not,
  pick,
  map,
  pipe
} = require('ramda')

const { equalsByKeys, listAll, pickExluded, defaultToAnArray } = require('.')
const { utils } = require('@serverless/core')

const createOrUpdateFunctions = async (appSync, config, debug) => {
  debug('create or update')
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

  const functionsToDeploy = pipe(
    map((func) => {
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
    }),
    filter((func) => {
      return not(equals(func.mode, 'ignore'))
    })
  )(functionsWithTemplates)

  await Promise.all(
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
        return appSync.createFunction(params).promise()
      } else if (equals(func.mode, 'update')) {
        return appSync.updateFunction(merge(params, { functionId: func.functionId })).promise()
      }
    }, functionsToDeploy)
  )
}

const removeObsoleteFunctions = async (appSync, config, state, debug) => {}

module.exports = {
  createOrUpdateFunctions,
  removeObsoleteFunctions
}

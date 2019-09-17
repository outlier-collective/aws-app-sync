const { listAll, equalsByKeys, defaultToAnArray } = require('.')
const {
  isNil,
  difference,
  equals,
  filter,
  find,
  map,
  not,
  flatten,
  merge,
  pipe,
  pick
} = require('ramda')
const { utils } = require('@serverless/core')
const createOrUpdateResolvers = async (appSync, config, debug) => {
  debug('create or update resolvers')
  const deployedResolvers = pipe(
    flatten,
    map((resolver) =>
      merge(resolver, {
        type: resolver.typeName,
        field: resolver.fieldName,
        dataSource: resolver.dataSourceName
      })
    )
  )(
    await Promise.all(
      map(
        async (mappingTemplate) =>
          listAll(
            appSync,
            'listResolvers',
            { apiId: config.apiId, typeName: mappingTemplate.type },
            'resolvers'
          ),
        config.mappingTemplates
      )
    )
  )

  const resolversWithTemplates = await Promise.all(
    map(async (resolver) => {
      let { requestMappingTemplate } = resolver
      if (isNil(requestMappingTemplate)) {
        requestMappingTemplate = await utils.readFile(resolver.request)
      }
      let responseMappingTemplate = resolver.requestMappingTemplate
      if (isNil(responseMappingTemplate)) {
        responseMappingTemplate = await utils.readFile(resolver.response)
      }
      return merge(resolver, { requestMappingTemplate, responseMappingTemplate })
    }, config.mappingTemplates)
  )

  const resolversToDeploy = pipe(
    map((resolver) => {
      const deployedResolver = find(
        ({ type, field }) => equals(type, resolver.type) && equals(field, resolver.field),
        deployedResolvers
      )
      const resolverEquals = isNil(deployedResolver)
        ? false
        : equalsByKeys(
            ['dataSource', 'type', 'field', 'responseMappingTemplate', 'requestMappingTemplate'],
            deployedResolver,
            resolver
          )

      const mode = not(resolverEquals) ? (not(deployedResolver) ? 'create' : 'update') : 'ignore'
      return merge(resolver, { mode })
    }),
    filter((resolver) => {
      return not(equals(resolver.mode, 'ignore'))
    })
  )(resolversWithTemplates)

  await Promise.all(
    map(async (dataSource) => {
      const params = {
        apiId: config.apiId,
        fieldName: dataSource.field,
        requestMappingTemplate: dataSource.requestMappingTemplate,
        responseMappingTemplate: dataSource.responseMappingTemplate,
        typeName: dataSource.type,
        dataSourceName: dataSource.dataSource,
        kind: dataSource.kind,
        pipelineConfig: dataSource.pipelineConfig
      }
      if (equals(dataSource.mode, 'create')) {
        return appSync.createResolver(params).promise()
      } else if (equals(dataSource.mode, 'update')) {
        return appSync.updateResolver(params).promise()
      }
    }, resolversToDeploy)
  )
}

const removeObsoleteResolvers = async (appSync, config, state, debug) => {
  debug('remove obsolete resolvers')
  const obsoleteResolvers = difference(
    defaultToAnArray(state.mappingTemplates),
    map(pick(['type', 'field']), defaultToAnArray(config.mappingTemplates))
  )
  await Promise.all(
    map(async (resolver) => {
      try {
        await appSync
          .deleteResolver({
            apiId: config.apiId,
            fieldName: resolver.field,
            typeName: resolver.type
          })
          .promise()
      } catch (error) {
        if (not(equals(code.message, 'NotFoundException'))) {
          throw error
        }
      }
    }, obsoleteResolvers)
  )
}

module.exports = { createOrUpdateResolvers, removeObsoleteResolvers }

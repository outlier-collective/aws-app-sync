const { checkForDuplicates, defaultToAnArray, equalsByKeys, listAll, readIfFile } = require('.')
const { difference, equals, find, isNil, map, not, flatten, merge, pick, pipe } = require('ramda')

/**
 * Create or update resolvers
 * @param {Object} appSync
 * @param {Object} config
 * @param {Function} debug
 * @return {Object} - deployed resolvers
 */
const createOrUpdateResolvers = async (appSync, config, debug) => {
  checkForDuplicates(['dataSource', 'type', 'field'], defaultToAnArray(config.mappingTemplates))
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
        defaultToAnArray(config.mappingTemplates)
      )
    )
  )

  const resolversWithTemplates = await Promise.all(
    map(async (resolver) => {
      const requestMappingTemplate = await readIfFile(resolver.request)
      const responseMappingTemplate = await readIfFile(resolver.response)
      return merge(resolver, { requestMappingTemplate, responseMappingTemplate })
    }, defaultToAnArray(config.mappingTemplates))
  )

  const resolversToDeploy = map((resolver) => {
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
  }, resolversWithTemplates)

  return await Promise.all(
    map(async (resolver) => {
      const params = {
        apiId: config.apiId,
        fieldName: resolver.field,
        requestMappingTemplate: resolver.requestMappingTemplate,
        responseMappingTemplate: resolver.responseMappingTemplate,
        typeName: resolver.type,
        dataSourceName: resolver.dataSource,
        kind: resolver.kind,
        pipelineConfig: resolver.pipelineConfig
      }
      if (equals(resolver.mode, 'create')) {
        debug(`Creating resolver ${resolver.field}/${resolver.typeName}`)
        await appSync.createResolver(params).promise()
      } else if (equals(resolver.mode, 'update')) {
        debug(`Updating resolver ${resolver.field}/${resolver.typeName}`)
        await appSync.updateResolver(params).promise()
      }
      return Promise.resolve(resolver)
    }, resolversToDeploy)
  )
}

/**
 * Remove obsolete resolvers
 * @param {Object} appSync
 * @param {Object} config
 * @param {Object} state
 * @param {Function} debug
 */
const removeObsoleteResolvers = async (appSync, config, state, debug) => {
  const obsoleteResolvers = difference(
    defaultToAnArray(state.mappingTemplates),
    map(pick(['type', 'field']), defaultToAnArray(config.mappingTemplates))
  )
  await Promise.all(
    map(async (resolver) => {
      debug(`Removing resolver ${resolver.field}/${resolver.typeName}`)
      try {
        await appSync
          .deleteResolver({
            apiId: config.apiId,
            fieldName: resolver.field,
            typeName: resolver.type
          })
          .promise()
      } catch (error) {
        if (not(equals(error.code, 'NotFoundException'))) {
          throw error
        }
        debug(`Resolver ${resolver.field}/${resolver.typeName} already removed`)
      }
    }, obsoleteResolvers)
  )
}

module.exports = { createOrUpdateResolvers, removeObsoleteResolvers }

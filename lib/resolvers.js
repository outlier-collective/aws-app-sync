const { listAll, equalsByKeys } = require('.')
const { isNil, equals, filter, find, map, not, flatten, merge, pipe } = require('ramda')
const { utils } = require('@serverless/core')
const createOrUpdateResolvers = async (appSync, config, debug) => {
  debug('create or update resolvers')
  const deployedResolvers = pipe(
    flatten,
    map((template) =>
      merge(template, {
        type: template.typeName,
        field: template.fieldName,
        dataSource: template.dataSourceName
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
    map(async (template) => {
      let { requestMappingTemplate } = template
      if (isNil(requestMappingTemplate)) {
        requestMappingTemplate = await utils.readFile(template.request)
      }
      let responseMappingTemplate = template.requestMappingTemplate
      if (isNil(responseMappingTemplate)) {
        responseMappingTemplate = await utils.readFile(template.response)
      }
      return merge(template, { requestMappingTemplate, responseMappingTemplate })
    }, config.mappingTemplates)
  )

  const resolversToDeploy = pipe(
    map((template) => {
      const deployedResolver = find(
        ({ type, field }) => equals(type, template.type) && equals(field, template.field),
        deployedResolvers
      )
      const resolverEquals = isNil(deployedResolver)
        ? false
        : equalsByKeys(
            ['dataSource', 'type', 'field', 'responseMappingTemplate', 'requestMappingTemplate'],
            deployedResolver,
            template
          )

      const mode = not(resolverEquals) ? (not(deployedResolver) ? 'create' : 'update') : 'ignore'
      return merge(template, { mode })
    }),
    filter((template) => {
      return not(equals(template.mode, 'ignore'))
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

module.exports = { createOrUpdateResolvers }

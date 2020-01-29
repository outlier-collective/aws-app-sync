const path = require('path')
const fs = require('fs')
const { checksum, readIfFile, sleep } = require('../utils')

/**
 * Create or update resolvers
 */
const createOrUpdateResolvers = async (appSync, inputs, state) => {

  const process = async (mt) => {
    let resolver
    try {
      resolver = await appSync.getResolver({
        apiId: state.apiId,
        fieldName: mt.field,
        typeName: mt.type,
      }).promise()
    } catch(error) {
      if (error.code !== 'NotFoundException') {
        throw error
      }
    }

    // Load mapping template
    try {
      if (mt.request) mt.request = fs.readFileSync(path.join(inputs.src, mt.request), 'utf8')
      if (mt.response) mt.response = fs.readFileSync(path.join(inputs.src, mt.response), 'utf8')
    } catch(error) {
      throw new Error(`Coulddn't load request/response mapping template files for type: ${mt.type}.  Is the path/format correct?  Here is the error: ${error.message}`)
    }

    // Format
    let params = {
      apiId: state.apiId,
      fieldName: mt.field,
      typeName: mt.type,
      dataSourceName: mt.dataSource,
      requestMappingTemplate: mt.request,
      responseMappingTemplate: mt.request
    }
    if (mt.caching) params.cachingConfig = mt.caching

    if (!resolver) {
      console.log(`Creating resolver: ${mt.field} - ${mt.type}`)
      resolver = await appSync.createResolver(params).promise()
    } else {
      console.log(`Updating resolver: ${mt.field} - ${mt.type}`)
      resolver = await appSync.updateResolver(params).promise()
    }
  }

  const operations = []

  inputs.mappingTemplates.forEach((mt) => {
    operations.push(process(mt))
  })

  return Promise.all(operations)
  .then()

}

/**
 * List Resolvers
 * @param {*} iam 
 * @param {*} policyName 
 */
const listResolvers = async(appSync, apiId, typeName) => {
  let resolvers = []
  let nextToken
  do {
    const list = await appSync
    .listResolvers({
      apiId,
      maxResults: 100,
      typeName,
      nextToken,
    })
    .promise()
    resolvers = resolvers.concat(list.resolvers)
    nextToken = list.nextToken ? list.nextToken : null
  }
  while (nextToken)
  
  return resolvers
}

/**
 * Exports
 */

module.exports = { createOrUpdateResolvers }

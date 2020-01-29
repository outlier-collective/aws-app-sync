const path = require('path')
const fs = require('fs')
const { checksum, readIfFile, sleep } = require('../utils')

/**
 * Create or update api keys
 * @param {*} appSync 
 * @param {*} inputs 
 * @param {*} state 
 */
const createOrUpdateApiKeys = async (appSync, inputs, state) => {

  const process = async (ak) => {
    let apiKey = await listAndFindApiKey(appSync, state.apiId, ak)

    // Create API Key
    if (!apiKey) {
      console.log(`Creating api key: ${ak}`)
      // Format
      apiKey = await appSync.createApiKey({ apiId: state.apiId }).promise()
    }
  }

  const operations = []

  inputs.apiKeys.forEach((ak) => {
    operations.push(process(ak))
  })

  return Promise.all(operations)
  .then()
}

/**
 * List and find api key
 * @param {*} appSync 
 * @param {*} apiId 
 * @param {*} apiKeyId 
 */
const listAndFindApiKey = async(appSync, apiId, apiKeyId) => {
  let apiKey
  let apiKeys = []
  let nextToken
  do {
    const list = await appSync
    .listApiKeys({
      apiId,
      maxResults: 25,
      nextToken,
    })
    .promise()
    apiKeys = apiKeys.concat(list.apiKeys)
    nextToken = list.nextToken ? list.nextToken : null
  }
  while (nextToken)

  // Find one with the same name
  apiKeys.forEach((ak) => {
    if (ak.id === apiKeyId) apiKey = ak
  })

  return apiKey ? apiKey : null
}

module.exports = {
  createOrUpdateApiKeys
}

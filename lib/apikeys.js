const { listAll, defaultToAnArray } = require('.')
const { clone, equals, find, is, isNil, map, merge, not, pick } = require('ramda')

const createOrUpdateApiKeys = async (appSync, config, state, debug) => {
  debug(`Fetching api keys`)
  const deployedApiKeys = await listAll(appSync, 'listApiKeys', { apiId: config.apiId }, 'apiKeys')

  const stateApiKeys = map((stateApiKey) => {
    const deployedApiKey = find(({ id }) => equals(stateApiKey.id, id), deployedApiKeys)
    return merge(stateApiKey, deployedApiKey)
  }, defaultToAnArray(state.apiKeys))

  const inputApiKeys = map(
    (apiKey) => (is(String, apiKey) ? { name: apiKey } : apiKey),
    defaultToAnArray(config.apiKeys)
  )

  const apiKeysToDeploy = map((apiKey) => {
    const stateApiKey = find(({ name }) => equals(apiKey.name, name), stateApiKeys)
    let apiKeysToDeploy
    if (isNil(stateApiKey)) {
      apiKeysToDeploy = merge(apiKey, { mode: 'create' })
    } else if (
      (not(isNil(apiKey.description)) &&
        not(equals(apiKey.description, stateApiKey.description))) ||
      (not(isNil(apiKey.expires)) && not(equals(apiKey.expires, stateApiKey.expires)))
    ) {
      apiKeysToDeploy = merge(merge(stateApiKey, { mode: 'update' }), apiKey)
    } else {
      apiKeysToDeploy = merge(merge(stateApiKey, { mode: 'ignore' }), apiKey)
    }
    return apiKeysToDeploy
  }, inputApiKeys)

  return Promise.all(
    map(async (apiKey) => {
      let currentApiKey = clone(apiKey)
      console.log(currentApiKey)
      if (equals(currentApiKey.mode, 'create')) {
        const response = await appSync
          .createApiKey({
            apiId: config.apiId,
            description: currentApiKey.description,
            expires: currentApiKey.expires
          })
          .promise()
        currentApiKey = merge(currentApiKey, { id: response.apiKey.id })
      } else if (equals(currentApiKey.mode, 'update')) {
        await appSync
          .updateApiKey({
            apiId: config.apiId,
            id: currentApiKey.id,
            description: currentApiKey.description,
            expires: currentApiKey.expires
          })
          .promise()
      }

      return pick(['name', 'id'], currentApiKey)
    }, defaultToAnArray(apiKeysToDeploy))
  )
  // const isoDateRegex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
}

module.exports = {
  createOrUpdateApiKeys
}

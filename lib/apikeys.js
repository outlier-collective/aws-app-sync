const { listAll, defaultToAnArray } = require('.')
const {
  clone,
  equals,
  difference,
  find,
  is,
  isNil,
  map,
  merge,
  not,
  pick,
  reduce,
  propEq
} = require('ramda')

const formatInputApiKeys = (apiKeys) =>
  map((apiKey) => (is(String, apiKey) ? { name: apiKey } : apiKey), defaultToAnArray(apiKeys))

const createOrUpdateApiKeys = async (appSync, config, state, debug) => {
  const deployedApiKeys = await listAll(appSync, 'listApiKeys', { apiId: config.apiId }, 'apiKeys')

  const stateApiKeys = reduce(
    (acc, stateApiKey) => {
      const deployedApiKey = find(propEq('id', stateApiKey.id), deployedApiKeys)
      if (not(isNil(deployedApiKey))) {
        acc.push(merge(stateApiKey, deployedApiKey))
      }
      return acc
    },
    [],
    defaultToAnArray(state.apiKeys)
  )

  const apiKeysToDeploy = map((apiKey) => {
    const stateApiKey = find(propEq('name', apiKey.name), stateApiKeys)
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
  }, formatInputApiKeys(config.apiKeys))

  return Promise.all(
    map(async (apiKey) => {
      let currentApiKey = clone(apiKey)
      if (equals(currentApiKey.mode, 'create')) {
        debug(`Creating api key ${currentApiKey.name}`)
        const response = await appSync
          .createApiKey({
            apiId: config.apiId,
            description: currentApiKey.description,
            expires: currentApiKey.expires
          })
          .promise()
        currentApiKey = merge(currentApiKey, { id: response.apiKey.id })
      } else if (equals(currentApiKey.mode, 'update')) {
        debug(`Updating api key ${currentApiKey.name}`)
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

const removeObsoleteApiKeys = async (appSync, config, state, debug) => {
  const obsoleteApiKeys = difference(
    map(pick(['name']), defaultToAnArray(state.apiKeys)),
    map(pick(['name']), formatInputApiKeys(config.apiKeys))
  )

  await Promise.all(
    map(async ({ name }) => {
      debug(`Removing api key ${name}`)
      const { id } = find(propEq('name', name), state.apiKeys)
      try {
        await appSync.deleteApiKey({ apiId: config.apiId, id }).promise()
      } catch (error) {
        if (not(equals(error.code, 'NotFoundException'))) {
          throw error
        }
        debug(`Api key ${name} already removed`)
      }
    }, obsoleteApiKeys)
  )
}

module.exports = {
  createOrUpdateApiKeys,
  removeObsoleteApiKeys
}

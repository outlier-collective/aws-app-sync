const {
  listAll,
} = require('.')

const createOrUpdateApiKeys = async (appSync, config, debug) => {
  // TODO - figure out how to index api keys e.g. name in state?
  debug(`Fetching api keys`)
  const apiKeys = []
  const deployedApiKeys = await listAll(
    appSync,
    'listApiKeys',
    { apiId: config.apiId },
    'apiKeys' // ?
  )
  console.log(deployedApiKeys)
  // await Promise.all(
  //   map(async (apiKey) => {
  //     console.log(apiKey)
  //   }, config.apiKeys)
  // )
  // const isoDateRegex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
}

module.exports = {
  createOrUpdateApiKeys
}

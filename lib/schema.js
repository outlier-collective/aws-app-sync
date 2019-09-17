const { utils } = require('@serverless/core')
const { includes, isNil } = require('ramda')

/**
 *
 * @param {*} appSync
 * @param {*} config
 * @param {*} debug
 */
const createSchema = async (appSync, config, debug) => {
  debug(`Create a schema for ${config.apiId}`)
  let { schema } = config
  if (isNil(schema)) {
    schema = 'schema.graphql'
  }
  schema = await utils.readFile(schema)
  await appSync
    .startSchemaCreation({
      apiId: config.apiId,
      definition: Buffer.from(schema)
    })
    .promise()
  let waiting = true
  do {
    const { status } = await appSync.getSchemaCreationStatus({ apiId: config.apiId }).promise()
    debug(`Schema creation status ${status} for ${config.apiId}`)
    if (includes(status, ['FAILED', 'SUCCESS', 'NOT_APPLICABLE'])) {
      waiting = false
    } else {
      await utils.sleep(1000)
    }
  } while (waiting)
}

module.exports = {
  createSchema
}

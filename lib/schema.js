const { utils } = require('@serverless/core')
const { equals, includes, isNil, not } = require('ramda')
const { checksum, readIfFile } = require('.')

/**
 * Create schema
 * @param {Object} appSync
 * @param {Object} config
 * @param {Object} state
 * @param {Function} debug
 * @return {Object} - schema checksum
 */
const createSchema = async (appSync, config, state, debug) => {
  debug(`Create a schema for ${config.apiId}`)
  let { schema } = config
  if (isNil(schema)) {
    schema = 'schema.graphql'
  }

  schema = await readIfFile(schema)

  const schemaChecksum = checksum(schema)
  if (not(equals(schemaChecksum, state.schemaChecksum))) {
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
  return schemaChecksum
}

module.exports = {
  createSchema
}

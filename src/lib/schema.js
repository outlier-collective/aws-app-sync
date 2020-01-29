const path = require('path')
const { checksum, readIfFile, sleep } = require('../utils')

/**
 * Process Schema
 * @param {*} appSync 
 * @param {*} inputs 
 * @param {*} state 
 */
const processSchema = async (appSync, inputs, state) => {

  console.log('Processing your schema...')

  let schema

  // Check if schema is an input.  If not, hope it's included as a file
  if (!inputs.schema) {
    console.log('Loading your schema from file: schema.graphql...')
    schema = 'schema.graphql'
    try {
      schema = await readIfFile(path.join(inputs.src, schema))
    } catch(error) {
      throw new Error(`Could not read "schema.graphql" because: ${error.message}`)
    }
    console.log('Successfully loaded: schema.graphql')
  }

  const schemaChecksum = checksum(schema)

  if (schemaChecksum === state.schemaChecksum) {
    console.log('Did not detect any changes to schema.  Skipping...')
    return schemaChecksum
  }

  console.log(`Creating/updating schema...`)
  await appSync
    .startSchemaCreation({
      apiId: state.apiId,
      definition: Buffer.from(schema)
    })
    .promise()
  let waiting = true
  do {
    const status = await appSync.getSchemaCreationStatus({ apiId: state.apiId }).promise()
    console.log(`Schema creation status ${status.status} for ${state.apiId}`)
    if (['FAILED', 'SUCCESS', 'NOT_APPLICABLE'].includes(status.status)) {
      console.log(`Schema status details: ${status.details}`)
      waiting = false
    } else {
      await sleep(1000)
    }
  } while (waiting)

  return schemaChecksum
}

module.exports = {
  processSchema,
}

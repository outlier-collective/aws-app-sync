const { clone, concat, equals, includes, isNil, not, pick, pickBy, defaultTo } = require('ramda')
const crypto = require('crypto')

const defaultToAnArray = defaultTo([])

/**
 * Returns a subset of a object excluding defined keys
 * @param {array} keys
 * @param {object} obj
 * @returns {object} subset
 */
const pickExluded = (keys, obj) => pickBy((val, key) => not(includes(key, keys)), obj)

const equalsByKeys = (keys, objA, objB) => equals(pick(keys, objA), pick(keys, objB))

const equalsByKeysExcluded = (keys, objA, objB) =>
  equals(pickExluded(keys, objA), pickExluded(keys, objB))

/**
 * List all
 * @param {*} service
 * @param {*} command
 * @param {*} params
 */
const listAll = async (service, command, params, key) => {
  let result = []
  let nextToken
  do {
    const currentParams = clone(params)
    if (not(isNil(nextToken))) {
      currentParams.nextToken = nextToken
    }
    const response = await service[command](params).promise()
    result = concat(result, response[key])
    // eslint-disable-next-line prefer-destructuring
    nextToken = response.nextToken
  } while (not(isNil(nextToken)))
  return result
}

const checksum = (data) => {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
}

module.exports = {
  pickExluded,
  equalsByKeys,
  equalsByKeysExcluded,
  listAll,
  checksum,
  defaultToAnArray
}

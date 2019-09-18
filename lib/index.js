const { clone, concat, equals, includes, isNil, not, pick, pickBy, defaultTo } = require('ramda')
const AWS = require('aws-sdk')

const defaultToAnArray = defaultTo([])

/**
 * Returns a subset of a object excluding defined keys
 * @param {array} keys
 * @param {object} obj
 * @returns {object} subset
 */
const pickExcluded = (keys, obj) => pickBy((val, key) => not(includes(key, keys)), obj)

const equalsByKeys = (keys, objA, objB) => equals(pick(keys, objA), pick(keys, objB))

const equalsByKeysExcluded = (keys, objA, objB) =>
  equals(pickExcluded(keys, objA), pickExcluded(keys, objB))

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

/**
 *
 */
const getAccountId = async () => {
  const STS = new AWS.STS()
  const res = await STS.getCallerIdentity({}).promise()
  return res.Account
}


module.exports = {
  pickExcluded,
  equalsByKeys,
  equalsByKeysExcluded,
  listAll,
  defaultToAnArray,
  getAccountId
}

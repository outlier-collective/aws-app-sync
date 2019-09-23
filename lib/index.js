const {
  clone,
  concat,
  defaultTo,
  equals,
  includes,
  isEmpty,
  isNil,
  filter,
  join,
  keys,
  length,
  not,
  pick,
  pickBy,
  reduce
} = require('ramda')
const AWS = require('aws-sdk')
const crypto = require('crypto')
const fs = require('fs')
const { utils } = require('@serverless/core')

const defaultToAnArray = defaultTo([])

/**
 * Returns a subset of a object excluding defined keys
 * @param {array} keys
 * @param {object} obj
 * @returns {object} subset
 */
const pickExcluded = (excludedKeys, obj) =>
  pickBy((val, key) => not(includes(key, excludedKeys)), obj)

const equalsByKeys = (keysToCheck, objA, objB) =>
  equals(pick(keysToCheck, objA), pick(keysToCheck, objB))

const equalsByKeysExcluded = (keysToCheck, objA, objB) =>
  equals(pickExcluded(keysToCheck, objA), pickExcluded(keysToCheck, objB))

/**
 * List all
 * @param {Object} service
 * @param {String} command
 * @param {Object} params
 * @param {String} key
 * @returns {Array} - array of all items
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
 * Returns current AWS account id
 * @returns {String} - account id
 */
const getAccountId = async () => {
  const STS = new AWS.STS()
  const res = await STS.getCallerIdentity({}).promise()
  return res.Account
}

/**
 * Create a checksum
 * @param {String} data
 * @returns {String} - checksum
 */
const checksum = (data) => {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
}

/**
 * Check if the filePath is a file
 * @param {*} filePath
 */
const isFile = async (filePath) =>
  new Promise((resolve) => {
    fs.stat(filePath, (error) => {
      if (error) {
        resolve(false)
      }
      resolve(true)
    })
  })

const getSubSet = (subSetKeys, source) =>
  not(isEmpty(subSetKeys)) ? pick(subSetKeys, source) : clone(source)

/**
 * Check that source array doesn't contain duplicates
 * @param {Array} dublicateKeys
 * @param {Array} source
 */
const checkForDuplicates = (dublicateKeys = [], source = []) => {
  const errors = reduce(
    (acc, item) => {
      const itemsFound = filter(
        (sourceItem) =>
          equals(getSubSet(dublicateKeys, item), getSubSet(dublicateKeys, sourceItem)),
        source
      )
      if (length(itemsFound) > 1) {
        acc.push(getSubSet(dublicateKeys, item))
      }
      return acc
    },
    [],
    source
  )
  if (length(errors) > 0) {
    // eslint-disable-next-line no-console
    console.error(errors)
    throw new Error(`Duplicated items found [${join(', ', errors)}]`)
  }
}

/**
 * Checks that source object has required keys
 * @param {Array} requiredKeys
 * @param {Object} source
 */
const checkForRequired = (requiredKeys = [], source = {}) => {
  const errors = reduce(
    (acc, requiredKey) => {
      if (not(includes(requiredKey, keys(source)))) {
        acc.push(requiredKey)
      }
      return acc
    },
    [],
    requiredKeys
  )
  if (not(isEmpty(errors))) {
    throw new Error(`Required parameter(s) missing [${join(', ', errors)}]`)
  }
}

/**
 * Reads if string is a file otherwise return
 * @param {Object|String} data
 * @returns {Object}
 */
const readIfFile = async (data) => {
  let result = data
  if (not(isNil(result)) && (await isFile(result))) {
    result = await utils.readFile(result)
  }
  return result
}

module.exports = {
  pickExcluded,
  equalsByKeys,
  equalsByKeysExcluded,
  listAll,
  defaultToAnArray,
  getAccountId,
  checksum,
  isFile,
  checkForDuplicates,
  checkForRequired,
  readIfFile
}

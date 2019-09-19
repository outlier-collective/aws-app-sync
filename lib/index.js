const { clone, concat, equals, includes, isNil, not, pick, pickBy, defaultTo } = require('ramda')
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
  new Promise((resolve, reject) => {
    fs.stat(filePath, (error, data) => {
      if (error) {
        resolve(false)
      }
      resolve(true)
    })
  })

const checkForDuplicates = (keys, array) => {}

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
  readIfFile
}

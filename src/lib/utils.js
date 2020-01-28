const AWS = require('aws-sdk')

/**
 * Sleep
 */
const sleep = async (wait) => new Promise((resolve) => setTimeout(() => resolve(), wait))

/**
 * Generate a random ID
 */
const generateRandomId = () => {
  return Math.random()
  .toString(36)
  .substring(6)
}

/**
 * Get AWS clients
 * @param {object} credentials
 * @param {string} region
 * @returns {object} AWS clients
 */
const getClients = (credentials, region = 'us-east-1') => {
  const appSync = new AWS.AppSync({ credentials, region })
  const iam = new AWS.IAM({ credentials, region })
  return {
    appSync,
    iam
  }
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
 * Exports
 */
 module.exports = {
   generateRandomId,
   getClients,
   getAccountId,
   sleep,
   equalsByKeysExcluded,
   pickExcluded,
   equalsByKeys,
 }
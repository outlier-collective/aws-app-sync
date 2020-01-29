const AWS = require('aws-sdk')
const fs = require('fs')
const crypto = require('crypto')

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

/**
 * Reads if string is a file otherwise return
 * @param {Object|String} data
 * @returns {Object}
 */
const readIfFile = async (data) => {
  let result = data
  if (result && (await isFile(result))) {
    result = fs.readFileSync(result, 'utf8')
  }
  return result
}

/**
 * Exports
 */
 module.exports = {
   generateRandomId,
   getClients,
   getAccountId,
   sleep,
   checksum,
   readIfFile
 }
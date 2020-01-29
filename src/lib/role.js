const utils = require('../utils')

/**
 * Create or update service role
 * Auto-creates policies based on data sources
 * @param {*} iam 
 * @param {*} inputs 
 */
const createOrUpdateServiceRole = async (iam, inputs) => {
  // const accountId = await getAccountId()

  const dataSources = {}

  // Auto-create role policy based on data sources
  // TODO: Add more data sources
  if (inputs.dataSources) {
    console.log('Auto-generating policies for all of the specified graphql data sources into an IAM role')
    inputs.dataSources.forEach((dataSource) => {
      // Ensure this data source is tracked on the parent object
      if (dataSources[dataSource.type]) {
        // Loop through existing instances of this data source type (e.g. there could be multiple AWS_LAMBDA sources)
        const instances = dataSources[dataSource.type]
        let skip = true
        instances.forEach((i) => {
          if (dataSource.config !== i.config) {
            skip = false
          }
        })
        // If the instance doesn't exist, add it to the array
        if (!skip) {
          dataSources[dataSource.type].push(dataSource)
        }
      } else {
        dataSources[dataSource.type] = [dataSource]
      }
    })
  }

  // Prepare IAM Role Policy Statements based on datasources
  // TODO: Add more datasources!
  const statements = []
  for (const key in dataSources) {
    const source = dataSources[key]
    if (key === 'AWS_LAMBDA') {
      source.forEach((instance) => {
        // Validate
        if (!instance.config) {
          throw new Error(`A dataSource with the type of ${source.type} is missing a "config" property`)
        }
        if (!instance.config.lambdaFunctionArn) {
          throw new Error(`A dataSource with the type of ${source.type} has a config object that is missing a "lambdaFunctionArn" property`)
        }

        // Add policy
        statements.push({
          Action: ['lambda:invokeFunction'],
          Effect: 'Allow',
          Resource: [ instance.config.lambdaFunctionArn ]
        })
      })
    }
  }

  // Auto-generate names
  const roleName = `${inputs.name}-role`
  const policyName = `${inputs.name}-policy`

  // Create or Get role (doesn't need to be updated)
  console.log('Creating or fetching AWS IAM Role')
  const role = await createOrGetRole(iam, roleName)

  // Create or Update policies (does need to be updated)
  console.log('Creating or updating your AWS IAM Role Policy')
  const policy = await createOrUpdatePolicy(iam, roleName, policyName, statements)

  return {
    role,
    policy,
  }
}

/**
 * Create or get role
 * @param {*} iam 
 * @param {*} roleName 
 */
const createOrGetRole = async (iam, roleName) => {

  console.log(`Starting role auto-creation for role "${roleName}"`)

  // Check for existing role
  let role
  try { role = await iam.getRole({ RoleName: roleName }).promise() } 
  catch(error) {  if (error.code !== 'NoSuchEntity') { throw error }}
  if (role) return role.Role

  // Otherwise, create one
  const assumeRolePolicyDocument = {
    Version: '2012-10-17',
    Statement: {
      Effect: 'Allow',
      Principal: {
        Service: [ 'appsync.amazonaws.com' ]
      },
      Action: 'sts:AssumeRole'
    }
  }
  const res = await iam
    .createRole({
      RoleName: roleName,
      Path: '/',
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument)
    })
    .promise()

  return res.Role
}

/**
 * Create or update role
 * @param {*} iam 
 * @param {*} roleName 
 */
const createOrUpdatePolicy = async (iam, roleName, policyName, statements) => {
  console.log(`Starting policy auto-creation for policy "${policyName}" and role "${roleName}"`)

  let policy

  // Prepare the create/update
  const policyDocument = JSON.stringify({ Version: '2012-10-17', Statement: statements })

  // List all policies in the account
  console.log(`Searching your account for an existing policy named: ${policyName}...`)
  policy = await listAndFindPolicy(iam, policyName)

  // If policy exists, delete it.  We will recreated it and attach it, as a way of updating it.
  if (policy) {
    console.log('Existing policy found.  Updating it...')
    await iam
      .detachRolePolicy({
        PolicyArn: policy.Arn,
        RoleName: roleName
      })
      .promise()
    await iam
      .deletePolicy({
        PolicyArn: policy.Arn
      })
      .promise()
  }

  // If policy does not exist...
  console.log('Creating/updating the policy...')
  policy = await iam.createPolicy({
    PolicyName: policyName,
    PolicyDocument: policyDocument // Permissions...
  }).promise()

  await utils.sleep(2500) // IAM APIs are notoriously unreliable.  Give it time...

  // Fetch the Policy via list again (because the ARN is not returned on create.  Grrr...)
  policy = await listAndFindPolicy(iam, policyName)

  // Attach it to the role
  await iam
  .attachRolePolicy({
    RoleName: roleName,
    PolicyArn: policy.Arn
  }).promise()
  console.log('The policy was created/updated successfully')

  return policy
}

/**
 * List and find policy
 * @param {*} iam 
 * @param {*} policyName 
 */
const listAndFindPolicy = async(iam, policyName) => {
  console.log(`Searching your account for an existing policy named: ${policyName}...`)
  let policy
  let policies = []
  let marker
  do {
    const list = await iam
    .listPolicies({
      Marker: marker || null,
      MaxItems: 100,
      OnlyAttached: false,
      Scope: 'Local',
    })
    .promise()
    policies = policies.concat(list.Policies)
    marker = list.Marker ? list.Marker : null
  }
  while (marker)
  
  // Find one with the same name
  policies.forEach((p) => {
    if (p.PolicyName === policyName) policy = p
  })

  return policy ? policy : null
}

/**
 * Remove service role and policy
 * @param {*} iam 
 * @param {*} autoRoleArn
 * @param {*} autoPolicyArn 
 */
const removeServiceRoleAndPolicy = async (iam, autoRoleArn, autoPolicyArn) => {
  try {
    await iam
      .detachRolePolicy({
        RoleName: autoRoleArn.split('/')[1], // extract role name from arn
        PolicyArn: autoPolicyArn
      })
      .promise()

    await utils.sleep(3000)

    await iam
      .deletePolicy({
        PolicyArn: autoPolicyArn
      })
      .promise()

    await utils.sleep(3000)

    await iam
      .deleteRole({
        RoleName: autoRoleArn.split('/')[1]
      })
      .promise()
  } catch (error) {
    if (error.code !== 'NoSuchEntity') {
      throw error
    }
  }
}

/**
 * Exports
 */
module.exports = {
  createOrUpdateServiceRole,
  removeServiceRoleAndPolicy,
}

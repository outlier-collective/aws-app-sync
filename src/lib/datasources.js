/**
 * Create or update data sources
 * @param {Object} appSync
 * @param {Object} config
 * @return {Object} - deployed data sources
 */
const createUpdateOrDeleteDataSources = async (appSync, inputs, state) => {

  let dataSourcesToCreate = []
  let dataSourcesToUpdate = []
  let dataSourcesToRemove = []

  // List all datasources
  let result = []
  let nextToken
  do {
    const params = {}
    if (nextToken) { params.nextToken = nextToken }
    const response = await appSync.listDataSources({ apiId: state.apiId }).promise()
    result = result.concat(response.dataSources)
    nextToken = response.nextToken
  } while (nextToken)
  const deployedDataSources = result

  // Add everything to be removed at first, then filter this list away.  We just need the name, to send to the AppSync API
  dataSourcesToRemove = deployedDataSources.map(ds => { return { apiId: state.apiId, name: ds.name, type: ds.type }})

  // Prepare full list of data sources to deploy
  inputs.dataSources.forEach((inputDS) => {

    // Currently, only AWS_LAMBDA is supported as a data type
    if (inputDS.type !== 'AWS_LAMBDA') return

    // Remove from "remove" array
    dataSourcesToRemove.splice(dataSourcesToRemove.findIndex(ds => ds.name === inputDS.name),1)
    
    // Prepare format App Sync APIs expect (our config is different, for reasons of simplicity)
    const formattedDS = {
      apiId: state.apiId,
      name: inputDS.name,
      type: inputDS.type,
      description: inputDS.description,
      serviceRoleArn: inputs.roleArn || state.autoRoleArn, // Add the service role from inputs/state here
    }

    // Format type: AWS_LAMBDA
    if (formattedDS.type === 'AWS_LAMBDA') {
      formattedDS.lambdaConfig = {}
      formattedDS.lambdaConfig.lambdaFunctionArn = inputDS.config.lambdaFunctionArn
    }

    // TODO: Add more data sources.  Don't forget to auto-create their policy in the IAM Role area (role.js) so this API can instantly use them!

    // Check existing data sources for which need to be updated or removed
    deployedDataSources.forEach((deployedDS) => {
      // If datasource is still in inputs, update it
      if (formattedDS.type === deployedDS.type && formattedDS.name === deployedDS.name) {
        dataSourcesToUpdate.push(formattedDS)
      }
    })

    // Check for new datasources that need to be created
    let exists = dataSourcesToUpdate.find(d => d.name === inputDS.name)
    if (!exists) {
      dataSourcesToCreate.push(formattedDS)
    }
  })

  // Process Creates, Updates, Deletes
  const create = async(ds) => {
    console.log(`Creating datasource: ${ds.type} - ${ds.name}`)
    return await appSync.createDataSource(ds).promise()
  }
  const update = async(ds) => {
    console.log(`Updating datasource: ${ds.type} - ${ds.name}`)
    return await appSync.updateDataSource(ds).promise()
  }
  const remove = async(ds) => {
    console.log(`Deleting datasource: ${ds.type} - ${ds.name}`)
    delete ds.type // this breaks the API call
    return await appSync.deleteDataSource(ds).promise()
  }
  let actions = []
  actions = actions.concat(dataSourcesToCreate.map(create))
  actions = actions.concat(dataSourcesToUpdate.map(update))
  actions = actions.concat(dataSourcesToRemove.map(remove))

  return Promise.all(actions)
  .catch((err) => {
    err.message =`Could not perform operation on a datasource due to error: ${err.message}`
    throw err
  })
}

/**
 * Exports
 */
module.exports = {
  createUpdateOrDeleteDataSources
}

# aws-app-sync

Easily deploy AWS AppSync apps with [Serverless Components](https://github.com/serverless/components).

## Table of Contents

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

### 1. Install

```shell
$ npm install -g serverless
```

### 2. Create

Just create the following simple boilerplate:

```shell
$ touch serverless.yml # more info in the "Configure" section below
$ touch index.js       # your lambda code
$ touch .env           # your AWS api keys
```

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

### 3. Configure

```yml
# serverless.yml
myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    name: my-api-name
    authenticationType: API_KEY # API_KEY || AWS_IAM || AMAZON_COGNITO_USER_POOLS || OPENID_CONNECT
    apiKeys:
      - myApiKey
    # userPoolConfig:
    #   awsRegion: ${region}
    #   defaultAction: "ALLOW"
    #   userPoolId: "us-east-1_nnnn"
    # openIDConnectConfig: # if OPENID_CONNECT is used
    #    issuer: "NNN",
    #    authTTL: "1234"
    #    clientId: "NNN"
    #    iatTTL: "NNN"
    mappingTemplates:
      - dataSource: dynamodb_ds
        type: Query
        field: getMyField
        request: mapping-template-request.vtl
        response: mapping-template-response.vtl
    functions:
      - dataSource: dynamodb_ds
        name: my-function
        request: function-request.vtl
        response: function-response.vtl
    dataSources:
      - type: AMAZON_DYNAMODB
        name: dynamodb_ds
        # serviceRoleArn: ${serviceRole.arn} # when not set role is created behind the scenes
        config:
          tableName: ${tableName}
    schema: schema.graphql
```

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.

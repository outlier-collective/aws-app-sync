# AWS AppSync Component

A full featured [Serverless Component](https://github.com/serverless/components) that instantly provisions an AppSync API on AWS.

## Features

- [x] Deploys in ~10 Seconds
- [x] Creates New APIs or Reuse Existing Ones
- [x] Supports Lambda Data Source
- [x] Supports DynamoDB Data Source
- [x] Supports ElasticSearch Data Source
- [x] Supports Relational Database Data Source
- [x] Supports API Keys Authentication
- [x] Supports Cognito User Pools Authentication
- [x] Supports OpenID Connect Authentication
- [x] Supports AppSync Functions

## Contents

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
    - [Create or Reuse APIs](#create-or-reuse-apis)
    - [Schema](#schema)
    - [Authentication](#authentication)
    - [Data Sources](#data-sources)
    - [Mapping Templates](#mapping-templates)
    - [Functions](#functions)
4. [Deploy](#4-deploy)

### 1. Install

```shell
$ npm install -g serverless
```

### 2. Create

Just create the following simple boilerplate:

```
$ touch serverless.yml # more info in the "Configure" section below
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

#### Create or Reuse APIs

#### Schema

#### Authentication

#### Data Sources

#### Mapping Templates

#### Functions

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.

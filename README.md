![Serverless AppSync Component](https://s3.amazonaws.com/assets.general.serverless.com/component_appsync/readme-appsync-serverless-component.gif)

# Serverless AppSync Component

A full featured [Serverless Component](https://github.com/serverless/components) that instantly provisions an AppSync API on AWS.

## Features

- [x] Fast Deployments (~10 seconds on average)
- [x] Create New APIs or Reuse Existing Ones
- [x] Supports Custom Domains with CDN & SSL Out of the Box
- [x] Supports Custom AppSync Service Role
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

#### Create or Reuse APIs

Create a new AWS AppSync service

```yml
# serverless.yml

myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    name: 'my-api-name'
    domain: api.example.com # example.com must be available in your AWS Route53
    authenticationType: 'API_KEY'
    apiKeys:
      - 'myApiKey'
    mappingTemplates:
      - dataSource: 'dynamodb_ds'
        type: 'Query'
        field: 'getMyField'
        request: 'mapping-template-request.vtl'
        response: 'mapping-template-response.vtl'
    functions:
      - dataSource: 'dynamodb_ds'
        name: 'my-function'
        request: 'function-request.vtl'
        response: 'function-response.vtl'
    dataSources:
      - type: 'AMAZON_DYNAMODB'
        name: 'dynamodb_ds'
        config:
          tableName: 'my-dynamo-table'
    schema: 'schema.graphql'
```

Reuse an existing AWS AppSync service by adding apiId to the inputs. This way the component will modify the AppSync service by those parts which are defined.

```yml
# serverless.yml

myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    apiId: 'm3vv766ahnd6zgjofnri5djnmq'
    mappingTemplates:
      - dataSource: 'dynamodb_2_ds'
        type: 'Query'
        field: 'getMyField'
        request: 'mapping-template-request.vtl'
        response: 'mapping-template-response.vtl'
    dataSources:
      - type: 'AMAZON_DYNAMODB'
        name: 'dynamodb_2_ds'
        config:
          tableName: 'my-dynamo-table'
```

#### Schema

#### Authentication

The app using AppSync API can use four different methods for authentication.

- API_KEY - Api keys
- AWS_IAM - IAM Permissions
- OPENID_CONNECT - OpenID Connect provider
- AMAZON_COGNITO_USER_POOLS - Amazon Cognito user pool

When using OpenID connect method, inputs has to contain `openIDConnectConfig` block.

```yaml
myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    authenticationType: 'OPENID_CONNECT'
    openIDConnectConfig:
      issuer: 'NNN'
      authTTL: '1234'
      clientId: 'NNN'
      iatTTL: '1234'
```

When using Amazon Cognito user pools, `userPoolConfig` has to be defined.

```yaml
myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    authenticationType: 'AMAZON_COGNITO_USER_POOLS'
    userPoolConfig:
      awsRegion: 'us-east-1'
      defaultAction: 'ALLOW'
      userPoolId: 'us-east-1_nnn'
```

ApiKey can be created and modified by defining `apiKeys`.

```yaml
myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    apiKeys:
      - 'myApiKey1' # using default expiration data
      - name: 'myApiKey2'
        expires: 1609372800
      - name: 'myApiKey3'
        expires: '2020-12-31'
```

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

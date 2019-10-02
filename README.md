![Serverless AppSync Component](https://s3.amazonaws.com/assets.general.serverless.com/component_appsync/readme-appsync-serverless-component.gif)

# Serverless AppSync Component

The AppSync [Serverless Component](https://github.com/serverless/components) allows you to easily and quickly deploy GraphQL APIs on AWS, and integrate them with AWS Lambda, DynamoDB & others. It supports all AWS AppSync features, while offering sane defaults that makes working with AppSync a lot easier without compromising on flexibility. 

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
   - [Basic Configuration](#basic-configuration)
   - [Custom Domain](#custom-domains)
   - [Create or Reuse APIs](#create-or-reuse-apis)
   - [Authentication](#authentication)
   - [Schema Configuration](#schema)
   - [Data Sources & Templates](#data-sources--templates)
   - [Functions](#functions)

4. [Deploy](#4-deploy)

## 1. Install

```shell
$ npm install -g serverless
```

## 2. Create

Just create the following simple boilerplate:

```
$ touch serverless.yml # more info in the "Configure" section below
$ touch schema.graphql # your graphql schema file
$ touch index.js       # only required if you use a Lambda data source 
$ touch .env           # your AWS api keys
```

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

## 3. Configure

### Basic Configuration
The following is a simple configuration that lets you get up and running quickly with a Lambda data source. Just add it to the `serverless.yml` file:


```yml
myLambda:
  component: "@serverless/aws-lambda"
  inputs:
    handler: index.handler
    code: ./

myAppSyncApi:
  component: "@serverless/aws-app-sync"
  inputs:
    # creating the API and an API key
    name: Posts
    authenticationType: API_KEY
    apiKeys:
      - myApiKey

    # defining your lambda data source
    dataSources:
      - type: AWS_LAMBDA
        name: getPost
        config:
          lambdaFunctionArn: ${myLambda.arn}

    # mapping schema fields to the data source
    mappingTemplates:
      - dataSource: getPost
        type: Query
        field: getPost
```
This configuration works with the following example schema. Just add it to the `schema.graphql` file right next to `serverless.yml`:

```
schema {
  query: Query
}

type Query {
  getPost(id: ID!): Post
}

type Post {
  id: ID!
  author: String!
  title: String
  content: String
  url: String
}
```
You'll also need to add the following handler code for this example to work:

```js
exports.handler = async event => {
  var posts = {
    "1": {
      id: "1",
      title: "First Blog Post",
      author: "Eetu Tuomala",
      url: "https://serverless.com/",
      content:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s."
    },
    "2": {
      id: "2",
      title: "Second Blog Post",
      author: "Siddharth Gupta",
      url: "https://serverless.com",
      content:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s."
    }
  };

  return posts[event.id];
};
```

For more advanced usage, keep reading!

### Custom Domains
You could optionally specify a custom domain for your GraphQL API, just add a domain property to the app sync component inputs:

```yml
myAppSyncApi:
  component: "@serverless/aws-app-sync"
  inputs:
    domain: api.example.com # add your custom domain here
    name: Posts
    # ... rest of config here

```
This would create a CloudFront distribution (aka CDN) for your AppSync API, which reduces request latency significantly, and would give you an SSL certificate out of the box powered by AWS ACM.

Please note that your domain (example.com in this example) must have been purchased via AWS Route53 and available in your AWS account. For advanced users, you may also purchase it elsewhere, then configure the name servers to point to an AWS Route53 hosted zone. How you do that depends on your registrar.

### Create or Reuse APIs

The AppSync component allows you to either create an AppSync API from scratch, or integrate with an existing one. Here's how to create a new API:

```yml
# serverless.yml

myAppSync:
  component: '@serverless/aws-app-sync'
  inputs:
    name: 'my-api-name' # specifying a name creates a new API
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
    schema: 'schema.graphql' # optional. Default behavior would look for schema.graphql file in the cwd
```

Reuse an existing AWS AppSync service by adding replacing the `name` input with `apiId`. This way the component will modify the AppSync service by those parts which are defined.

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

### Authentication

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

### Schema
You can define the schema of your GraphQL API by adding it to the `schema.graphql` file right next to `serverless.yml`. Here's a simple example schema:

```
schema {
  query: Query
}

type Query {
  getPost(id: ID!): Post
}

type Post {
  id: ID!
  author: String!
  title: String
  content: String
  url: String
}
```

Alternatively, if you have your schema file at a different location, you can specify the new location in `serverless.yml`

```yml
  inputs:
    name: myGraphqlApi
    schema: ./path/to/schema.graphql # specify your schema location
```

### Data Sources & Mapping Templates
The AppSync component supports 4 AppSync data sources and their corresponding mapping templates:

#### Lambda Data Source
You could add as many Lambda data sources as your application needs. For each field (or operation) in your Schema (ie. `getPost`), you'll need to add a mapping template that maps to a data source, which maps to a certain lambda ARN.

Here's an example...

```yml
myLambda:
  component: "@serverless/aws-lambda"
  inputs:
    handler: index.handler
    code: ./

myAppSyncApi:
  component: "@serverless/aws-app-sync"
  inputs:
    # creating the API and an API key
    name: Posts
    authenticationType: API_KEY
    apiKeys:
      - myApiKey

    # defining your lambda data source
    dataSources:
      - type: AWS_LAMBDA
        name: getPost
        config:
          lambdaFunctionArn: ${myLambda.arn} # pass the lambda arn from the aws-lambda component above
      - type: AWS_LAMBDA
        name: addPost
        config:
          lambdaFunctionArn: ${myLambda.arn} # you could pass another lambda ARN, or the same one if it handles that field

    # mapping schema fields to the data source
    mappingTemplates:
      - dataSource: getPost
        type: Query
        field: getPost
      - dataSource: addPost
        type: Mutation
        field: addPost

        # Minimal request/response templates are added by default that works for 99% of use cases.
        # But you could also overwrite them with your own templates by specifying the path to the template files
        request: request.vtl
        response: response.vtl
```

#### DynamoDB Data Source

#### ElasticSearch Data Source

#### Relational Database Data Source

### Functions

## 4. Deploy
To deploy, just run the following command in the directory containing your `serverless.yml file`:

```shell
$ serverless
```

After few seconds (up to a minute if it's your first deployment), you should see an output like this:

```
  myAppSyncApi:
    apiId:   samrhyo7srbtvkpqnj4j6uq6gq
    arn:     arn:aws:appsync:us-east-1:552751238299:apis/samrhyo7srbtvkpqnj4j6uq6gq
    url:     "https://samrhyo7srbtvkpqnj4j6uq6gq.appsync-api.us-east-1.amazonaws.com/graphql"
    apiKeys:
      - da2-coeytoubhffnfastengavajsku
    domain:  "https://api.example.com/graphql"

  9s › myAppSyncApi › done

myApp (master)$
```

&nbsp;

## New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.

![Serverless AppSync Component](https://s3.amazonaws.com/assets.general.serverless.com/component_appsync/readme-appsync-serverless-component.gif)

# Serverless AppSync Component

The AppSync [Serverless Component](https://github.com/serverless/components) allows you to easily and quickly deploy GraphQL APIs on AWS, and integrate them with AWS Lambda, DynamoDB & others. It supports all AWS AppSync features, while offering sane defaults that makes working with AppSync a lot easier without compromising on flexibility.

## Features

- [x] Fast Deployments (~10 seconds on average)
- [x] Auto-creates an AWS IAM Role based on your datasources
- [x] Supports Lambda Data Source
- [x] Supports API Keys Authentication

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
$ npm install -g serverless@components
```

## 2. Create

Just create the following simple boilerplate:

```
serverless.yml # more info in the "Configure" section below
src/schema.graphql # your graphql schema file
src/mapping_1/request.vtl # your request velocity template
src/mapping_1/response.vtl # your response velocity template
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
org: my-org
app: my-blog
component: aws-app-sync
name: graphql-api
stage: dev

inputs:
    name: ${name}-${stage}
    src: ./src
    authenticationType: API_KEY
    apiKeys:
        - '123456'
    dataSources:
        - type: AWS_LAMBDA
          name: blog
          config:
              lambdaFunctionArn: ${output:my-blog:${stage}:blog-backend.arn}
    mappingTemplates:
        - dataSource: blog
          type: Query
          field: getPosts
          request: ./vtl/request.vtl
          response: ./vtl/response.vtl

```

This configuration works with the following example schema. Just add it to the `schema.graphql` file right next to `serverless.yml`:

```graphql
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

### Authentication

The app using AppSync API can use four different methods for authentication.

- API_KEY - Api keys
- AWS_IAM - IAM Permissions

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
You can define the schema of your GraphQL API by adding it to the `schema.graphql` file in a `src` folder. Here's a simple example schema:

```graphql
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

### Data Sources & Templates
The AppSync component supports 1 AppSync data source and their corresponding mapping templates. You could add as many data sources as your application needs. For each field (or operation) in your Schema (ie. `getPost`), you'll need to add a mapping template that maps to a data source.

Here are the data sources that are supported:

#### Lambda Data Source
See the above example for AWS Lambda as a data source.

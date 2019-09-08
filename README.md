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

You can configure the component to either create a new appsync service from scratch, or extend an existing one.

#### Creating REST APIs

You can create a new ....

```yml
# serverless.yml
temp: temp
```

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.

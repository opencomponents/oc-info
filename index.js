#!/usr/bin/env node

'use strict'

const _ = require('lodash')
const async = require('async')
const colors = require('colors')
const parseAuthor = require('parse-author')
const request = require('minimal-request')

const fetchList = (url, cb) => {
  request({
    url,
    json: true
  }, (err, body) => {
    if (err || !body || body.type !== 'oc-registry') {
      return cb(new Error('oc registry url is not valid'))
    }

    cb(err, body.components)
  })
}

const log = (msg, type) => {
  const colour = { 'error': 'red', 'warn': 'yellow', 'ok': 'green' }[type]

  if (colour) {
    msg = colors[colour](msg)
  }

  return console.log(msg)
}

const exit = (msg) => {
  if (msg) {
    log(msg, 'error')
    process.exit(1)
  }

  process.exit(0)
}

const getParams = (cb) => {
  if (process.argv.length < 4) {
    return cb(`Usage: oc-info https://your-registry-url.domain.com <option>

Available options:
* authors :: shows all the authors of active components`)
  }

  const params = { url: process.argv[2], option: process.argv[3] }

  if (params.option !== 'authors') {
    return cb(`option ${params.option} is not valid`)
  }

  cb(null, params)
}

getParams((err, params) => {
  if (err) { return exit(err) }

  fetchList(params.url, (err, list) => {
    if (err) { return exit(err) }

    async.map(list, (componentHref, next) => {
      request({ url: `${componentHref}/~info`, json: true }, next)
    }, (err, componentsInfo) => {
      if (err) { return exit(err) }

      const authors = []
      let componentsCount = 0

      _.each(componentsInfo, (componentInfo) => {
        if ((!componentInfo.oc.state || componentInfo.oc.state !== 'deprecated') && componentInfo.author) {
          const parsed = _.isString(componentInfo.author) ? parseAuthor(componentInfo.author) : componentInfo.author
          let stringified = parsed.name + (parsed.email ? ` <${parsed.email}>` : '')
          authors.push(stringified)
          componentsCount++
        }
      })
      const uniqAuthors = _.map(_.countBy(authors), (v, k) => `${k} (${v})`)
      log(`Found ${uniqAuthors.length} component authors for ${componentsCount} active components:\n`, 'ok')
      console.log(`* ${uniqAuthors.sort().join('\n* ')}`)
    })
  })
})

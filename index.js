#!/usr/bin/env node

'use strict'

const _ = require('lodash')
const async = require('async')
const colors = require('colors')
const parseAuthor = require('parse-author')
const request = require('minimal-request')

const usage = `Usage: oc-info https://your-registry-url.domain.com <option> [--details]

Available options:
* authors       :: shows all the authors of active components
* dependencies  :: shows all the dependencies of active components
* plugins       :: shows all the plugins of active components`

const fetchList = (url, cb) => {
  request({ url, json: true }, (err, body) => {
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
    return cb(usage)
  }

  const params = { url: process.argv[2], option: process.argv[3], details: process.argv[4] === '--details' }
  const allowedOptions = ['authors', 'dependencies', 'plugins']

  if (!_.includes(allowedOptions, params.option)) {
    return cb(`option ${params.option} is not valid\n${usage}`)
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
      const dependencies = []
      const plugins = []
      const authorsComponents = {}
      const dependenciesComponents = {}
      const pluginsComponents = {}

      let componentsCount = 0

      _.each(componentsInfo, (componentInfo) => {
        if ((!componentInfo.oc.state || componentInfo.oc.state !== 'deprecated') && componentInfo.author) {
          const componentDescription = `${componentInfo.name}@${componentInfo.version}`

          const parsed = _.isString(componentInfo.author) ? parseAuthor(componentInfo.author) : componentInfo.author
          let stringified = parsed.name + (parsed.email ? ` <${parsed.email}>` : '')
          authors.push(stringified)
          authorsComponents[stringified] = authorsComponents[stringified] || []
          authorsComponents[stringified].push(componentDescription)

          if (componentInfo.dependencies) {
            _.each(_.keys(componentInfo.dependencies), dependency => {
              dependencies.push(dependency)
              dependenciesComponents[dependency] = dependenciesComponents[dependency] || []
              dependenciesComponents[dependency].push(componentDescription)
            })
          }
          if (componentInfo.oc.plugins) {
            _.each(componentInfo.oc.plugins, plugin => {
              plugins.push(plugin)
              pluginsComponents[plugin] = pluginsComponents[plugin] || []
              pluginsComponents[plugin].push(componentDescription)
            })
          }
          componentsCount++
        }
      })

      const showSummary = (k, v, components) => {
        return components ? `${k} (${v})\n\t* ${colors.yellow(components[k].join('\n\t* '))}` : `${k} (${v})`
      }

      if (params.option === 'authors') {
        const uniqAuthors = _.map(_.countBy(authors), (v, k) => showSummary(k, v, params.details ? authorsComponents : null))
        log(`Found ${uniqAuthors.length} component authors for ${componentsCount} active components:\n`, 'ok')
        console.log(`* ${uniqAuthors.sort().join('\n* ')}`)
      } else if (params.option === 'dependencies') {
        const uniqDeps = _.map(_.countBy(dependencies), (v, k) => showSummary(k, v, params.details ? dependenciesComponents : null))
        log(`Found ${uniqDeps.length} node.js dependencies for ${componentsCount} active components:\n`, 'ok')
        console.log(`* ${uniqDeps.sort().join('\n* ')}`)
      } else if (params.option === 'plugins') {
        const uniqPlugins = _.map(_.countBy(plugins), (v, k) => showSummary(k, v, params.details ? pluginsComponents : null))
        log(`Found ${uniqPlugins.length} node.js plugins for ${componentsCount} active components:\n`, 'ok')
        console.log(`* ${uniqPlugins.sort().join('\n* ')}`)
      }
    })
  })
})

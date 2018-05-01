const chalk = require('chalk')
const glob = require('fast-glob')
const htmlUtils = require('./utils')
const httpsPost = require('./https-post')
const path = require('path')
const renderNunjucks = require('./render-nunjucks')

module.exports = function () {
  const context = process.cwd()
  const files = glob.sync('*.njk', { cwd: path.join(context, 'src/prototypes') })
  const requests = []
  const options = {
    hostname: 'validator.w3.org',
    port: '443',
    path: '/nu/?out=json',
    method: 'POST',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'User-Agent': '@pangolin/core'
    }
  }

  files.forEach(file => {
    let fileName = path.basename(file)
    let inputPath = path.join('prototypes', fileName)

    requests.push(renderNunjucks(context, inputPath)
      .then(html => {
        return httpsPost(options, html)
      }, error => {
        htmlUtils.log.error(error, inputPath)
        process.exit(1)
      })
      .then(data => {
        let result = JSON.parse(data)
        result.path = inputPath

        return result
      }, error => {
        htmlUtils.log.connectionError(error)
        return false
      }))
  })

  Promise.all(requests)
    .then(results => {
      // Skip error logging if validator connection failed
      if (!results[0]) return

      let messages = [].concat(...results.map(item => item.messages))
      let errors = messages.filter(item => item.type === 'error')

      let messageType = errors.length
        ? chalk`{white.bgRed  ERROR }`
        : chalk`{black.bgCyan  INFO }`

      if (messages.length) {
        console.log(chalk`\n${messageType} HTML validation\n`)
        htmlUtils.log.lint(results)
      }

      if (errors.length) {
        console.error(`  HTML validation failed with ${errors.length} ${errors.length === 1 ? 'error' : 'errors'}\n`)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error(error)
    })
}
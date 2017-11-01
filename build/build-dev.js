process.env.NODE_ENV = 'development'
process.env.FESG_ENV = 'build:dev'

const fs = require('fs-extra')
const glob = require('glob')
const path = require('path')
const webpack = require('webpack')

const nunjucksError = require('./html/format-error')
const renderNunjucks = require('./html/render-nunjucks')

module.exports = cwd => {
  const webpackConfig = require('./webpack.build.config')(cwd)

  // Empty output path to get rid of leftovers
  fs.emptyDir(`${cwd}/dev`, error => {
    if (error) throw error

    // Run the webpack pipeline
    webpack(webpackConfig, (error, stats) => {
      if (error) throw error

      console.log(stats.toString({
        children: false,
        chunks: false,
        chunkModules: false,
        colors: true,
        errors: false,
        modules: false
      }) + '\n')

      if (stats.hasErrors()) {
        process.exit(1)
      }
    })

    // Render components and write HTML files
    glob('*/docs.njk', { cwd: `${cwd}/src/components` }, (error, files) => {
      if (error) throw error

      files.forEach(file => {
        let name = path.dirname(file)

        let inputPath = `components/${name}/docs.njk`
        let outputPath = `${cwd}/dev/components/${name}.html`

        renderNunjucks(cwd, inputPath)
          .then(html => {
            fs.outputFile(outputPath, html, error => {
              if (error) throw error
            })
          })
          .catch(error => {
            nunjucksError(error)
            process.exit(1)
          })
      })
    })

    // Render prototypes and write HTML files
    glob('*.njk', { cwd: `${cwd}/src/prototypes` }, (error, files) => {
      if (error) throw error

      files.forEach(file => {
        let name = path.basename(file, '.njk')

        let inputPath = `prototypes/${name}.njk`
        let outputPath = `${cwd}/dev/${name}.html`

        renderNunjucks(cwd, inputPath)
          .then(html => {
            fs.outputFile(outputPath, html, error => {
              if (error) throw error
            })
          })
          .catch(error => {
            nunjucksError(error)
            process.exit(1)
          })
      })
    })
  })
}

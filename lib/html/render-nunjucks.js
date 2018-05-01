const nunjucks = require('nunjucks')
const path = require('path')

const htmlUtils = require('./utils')
const pageList = require('./page-list')
const SectionExtension = require('./section-extension')

// Cache templates
const templates = {
  head: htmlUtils.loadTemplate('head'),
  sidebar: htmlUtils.loadTemplate('sidebar'),
  footer: htmlUtils.loadTemplate('footer'),
  components: htmlUtils.loadTemplate('components')
}

/**
 * Get page name and URL
 * @param {string} context Project directory
 * @param {string} pageType `components` or `prototypes`
 * @param {string} currentFile The file currently being processed
 */
function pageObjects (context, pageType, currentFile) {
  return pageList[pageType](context).map((page) => {
    return {
      name: page.charAt(0).toUpperCase() + page.slice(1),
      url: pageType === 'components'
        ? `components/${page}.html`
        : `${page}.html`,
      active: pageType === 'components'
        ? `components${path.sep}${page}` === path.dirname(currentFile)
        : page === path.basename(currentFile, '.njk')
    }
  })
}

/**
 * Render Nunjucks file to string
 * @param {string} context Project directory
 * @param {string} file File to render
 * @return {Promise<string>}
 */
module.exports = function (context, file) {
  return new Promise((resolve, reject) => {
    // Create Nunjucks environment
    let env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(path.join(context, 'src'))
    )

    // Prefix URL to make it relative
    env.addFilter('relative', (url) => {
      if (file.split(path.sep)[0] === 'components') {
        return `../${url}`
      } else {
        return url
      }
    })

    // Add custom section tag
    env.addExtension('SectionExtension', new SectionExtension())

    // Add environment variables to Nunjucks
    env.addGlobal('process', {
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PANGOLIN_ENV: process.env.PANGOLIN_ENV
      }
    })

    const head = () => {
      let html = new nunjucks.Template(templates.head, env).render()

      return new nunjucks.runtime.SafeString(html)
    }

    const sidebar = () => {
      let html = new nunjucks.Template(templates.sidebar, env).render({
        components: pageObjects(context, 'components', file),
        prototypes: pageObjects(context, 'prototypes', file)
      })

      return new nunjucks.runtime.SafeString(html)
    }

    const footer = () => {
      let html = new nunjucks.Template(templates.footer, env).render()

      return new nunjucks.runtime.SafeString(html)
    }

    const components = () => {
      return new nunjucks.Template(templates.components, env)
    }

    // Add components, footer, and sidebar templates
    env.addGlobal('pangolin', {
      head: head(),
      sidebar: sidebar(),
      footer: footer(),
      components: components()
    })

    env.render(file, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}
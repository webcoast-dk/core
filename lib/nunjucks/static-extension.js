const store = require('../utils/store')

/**
 * Nunjucks static URL extension
 */
module.exports = function () {
  this.tags = ['static']

  this.parse = function (parser, nodes) {
    const token = parser.nextToken()
    const args = parser.parseSignature(null, true)

    parser.advanceAfterBlockEnd(token)

    return new nodes.CallExtension(this, 'run', args)
  }

  this.run = function (context, url) {
    return store.config.project.base + url
  }
}
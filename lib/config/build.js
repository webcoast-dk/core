const CopyPlugin = require('copy-webpack-plugin')
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const ImageminPlugin = require('imagemin-webpack-plugin').default
const merge = require('webpack-merge')

module.exports = context => {
  return merge(require('./base')(context), {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    plugins: [
      new CopyPlugin([
        {
          from: 'src/assets',
          to: 'assets'
        },
        {
          context: __dirname,
          from: '../../dist',
          to: 'pangolin',
          ignore: [process.env.PANGOLIN_ENV === 'build:dev' ? '' : '*']
        }
      ]),
      new ImageminPlugin({
        test: /\.(jpe?g|png|gif|svg)$/i,
        jpegtran: {
          progressive: true
        }
      }),
      new FriendlyErrorsPlugin({
        clearConsole: false
      })
    ]
  })
}
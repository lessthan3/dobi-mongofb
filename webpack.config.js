const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');

const PROD_MODE = process.env.NODE_ENV === 'production';
const DEV_MODE = !PROD_MODE;
const DIST_PATH = path.join(__dirname, 'dist');
const EXCLUDE = /node_modules|test/;

module.exports = {
  devtool: DEV_MODE ? 'eval-source-map' : 'nosources-source-map',
  entry: [
    path.join(__dirname, 'lib', 'client'),
  ],
  mode: DEV_MODE ? 'development' : 'production',
  module: {
    rules: [{
      oneOf: [
        {
          exclude: EXCLUDE,
          loader: 'babel-loader',
          test: /\.js$/,
          type: 'javascript/auto', // TODO: 'javascript/esm' breaks default imports & react-hot-loader
        },
      ],
    }],
    strictExportPresence: true,
  },
  node: {
    fs: 'empty',
    module: 'empty',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: DEV_MODE,
      }),
    ],
  },
  output: {
    filename: DEV_MODE ? 'client.js' : 'client.min.js',
    library: ['mongofb'],
    libraryTarget: 'umd',
    path: DIST_PATH,
    umdNamedDefine: true,
  },
  plugins: [
    new CleanWebpackPlugin([DIST_PATH]),
    new UnminifiedWebpackPlugin({
      postfix: 'fail',
    }),
  ],
  resolve: {
    extensions: ['.js', '.mjs'],
    modules: [
      path.resolve('lib/mongoFbClient'),
      'node_modules',
    ],
  },
};

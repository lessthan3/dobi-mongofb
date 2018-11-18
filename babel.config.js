'use strict';

const BABEL_PRESET_ENV_CONFIG = {
  forceAllTransforms: true,
  targets: {
    browsers: [
      'last 2 years',
      'ie 11',
    ],
  },
  useBuiltIns: 'entry',
};

module.exports = {
  ignore: [
    '**/babel.config.js',
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    'babel-plugin-dynamic-import-node',
    [
      '@babel/plugin-transform-runtime', {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: process.env.NODE_ENV !== 'test', // Jest + ES modules = no
      },
    ],
  ],
  presets: [
    ['@babel/preset-env', BABEL_PRESET_ENV_CONFIG],
  ],
};

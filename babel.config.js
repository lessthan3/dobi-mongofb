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
    '**/?(*.)(spec|test).js',
    '**/babel.config.js',
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false, // Jest + ES modules = no
      },
    ],
  ],
  presets: [
    ['@babel/preset-env', BABEL_PRESET_ENV_CONFIG],
  ],
};

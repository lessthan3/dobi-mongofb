module.exports = {
  plugins: [
    ['module-resolver', {
      root: ['./src'],
    }],
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '8.10',
        },
        useBuiltIns: 'entry',
      },
    ],
  ],
};

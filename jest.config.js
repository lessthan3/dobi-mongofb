'use strict';

module.exports = {
  collectCoverageFrom: [
    'src/**/*.m?js',
    'src/*.m?js',
  ],
  coveragePathIgnorePatterns: [
    '.*/coverage/.*',
    '.*/tests/.*',
    '.*/node_modules/.*',
    '.*/\..*',
    '.*/\.config\.m?js$',
  ],
  moduleFileExtensions: [
    'js',
    'mjs',
    'json',
  ],
  testEnvironment: 'node',
  testMatch: [
    '**/?(*.)test.?(m)js?(x)',
  ],
  transform: {
    '\.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!dobi-cache-2)',
  ],
};

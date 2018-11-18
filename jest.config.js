'use strict';

module.exports = {
  collectCoverageFrom: [
    '<rootDir>/src/**/*.?(m)js',
  ],
  coveragePathIgnorePatterns: [
    'coverage/',
    'node_modules/',
    '.env',
    'src/babel.config.js',
  ],
  moduleFileExtensions: [
    'js',
    'mjs',
    'json',
  ],
  moduleNameMapper: {
    axios: '<rootDir>/tests/axios.mock.js',
    'firebase/app': '<rootDir>/tests/firebase.mock.js',
    'firebase-admin': '<rootDir>/tests/firebase.mock.js',
    'firebase/auth': '<rootDir>/tests/firebase.mock.js',
    'firebase/database': '<rootDir>/tests/firebase.mock.js',
  },
  testEnvironment: 'node',
  testMatch: [
    '**/?(*.)test.?(m)js?(x)',
  ],
  transform: {
    '.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!dobi-cache-2)',
  ],
};

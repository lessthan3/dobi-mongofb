import {
  canInsert,
  canRead,
  canRemove,
  canUpdate,
  preFind,
} from './mongoFbMiddleware';

export default {
  cache: {
    enabled: false,
    max: 100,
    maxAge: 1000 * 60 * 5,
  },
  firebaseShards: [{
    apiKey: 'testApiKeyAlpha',
    credential: { credential: 'testCredentialAlpha' },
    databaseURL: 'https://testAlpha.firebaseio.com',
  }, {
    apiKey: 'testApiKeyBeta',
    credential: { credential: 'testCredentialBeta' },
    databaseURL: 'https://testBeta.firebaseio.com',
  }],
  middleware: {
    canInsert,
    canRead,
    canRemove,
    canUpdate,
    preFind,
  },
  mongodb: {
    database: 'mongoDatabase',
    host: 'localhost:8080',
    password: 'mongoPassword',
    port: 12345,
    user: 'mongoUser',
  },
  options: {
    collections: [
      'apps',
      'entities',
      'media',
      'objects',
      'pages',
      'sites',
      'packages_config',
      'packages',
      'site_users',
      'users',
    ],
  },
  root: '/api/v1',
};

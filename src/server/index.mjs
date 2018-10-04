/* eslint-disable no-underscore-dangle */

// dependencies
import assert from 'assert';
import express from 'express';
import mongodb from 'mongodb';
import admin from 'firebase-admin';
import Cache from 'dobi-cache-2';

import {
  find,
  findById,
  findOne,
  fixQueryParameters,
  sync,
} from './routes';

import {
  authGenerator,
  connectMongo,
  createObjectGenerator,
  editObjectGenerator,
  hasPermission as hasPermissionHelper,
} from './helpers';

/**
 *
 * @param {Object} config
 * @param {Object} config.cache
 * @param {boolean} config.cache.enabled=true
 * @param {number} config.cache.max=100
 * @param {string} config.cache.redisUri=localhost
 * @param {Object} config.firebaseShards
 * @param {string} config.firebaseShards.*.apiKey
 * @param {Object} config.firebaseShards.*.credential
 * @param {string} config.firebaseShards.*.databaseURL
 * @param {string} config.firebaseShards.*.legacySecret
 * @param {string} config.primaryFirebaseShard
 * @param {Object} config.hooks
 * @param {Object} config.mongodb
 * @param {Object} config.options
 * @param {string[]} config.options.blacklist=[] array of blocked collections
 * @param {number} config.options.limitDefault=20 default limit of query response
 * @param {number} config.options.limitMax=1000 max returned results
 * @param {boolean} config.options.setCreated=true
 * @param {boolean} config.options.setLastModified=true
 * @param {string} config.root='/api' endpoint root
 */
export const server = (config) => {
  // configuration
  const {
    cache: {
      enabled = true,
      max = 100,
      redisUri = 'localhost',
    } = {},
    firebaseShards = {},
    primaryFirebaseShard,
    hooks = {},
    mongodb: mongoDbConfig = {},
    options: {
      blacklist = [],
      limitDefault = 20,
      limitMax = 1000,
      setCreated = true,
      setLastModified = true,
    } = {},
    root = '/api',
  } = config;

  assert(primaryFirebaseShard, 'primaryFirebaseShard required');
  assert(firebaseShards[primaryFirebaseShard], 'config for primary firebase required');
  const primaryFbConfig = firebaseShards[primaryFirebaseShard];

  // create fb admin shards
  const fbAdminShards = {};
  for (const [shard, { credential, databaseURL }] of Object.entries(firebaseShards)) {
    fbAdminShards[shard] = admin.initializeApp({
      credential: admin.credential.cert(credential),
      databaseURL,
    }, `dobi-mongofb-admin-${shard}`);
  }

  // create cache
  const { cache } = new Cache({
    enabled,
    lruMaxItems: max,
    redisUri,
  });

  const auth = authGenerator(primaryFbConfig.legacySecret);
  const hasPermission = hasPermissionHelper({ auth, blacklist });

  // build routes
  const router = express.Router();

  // fix query parameters
  router.use(`${root}/*`, fixQueryParameters);

  // ObjectID for creating documents
  router.get(`${root}/ObjectID`, (req, res) => res.send(mongodb.ObjectID().toString()));

  // sync data from firebase
  // NOTE: requires _id to be an ObjectID
  // db.collection.update
  // db.collection.insert
  // db.collection.remove
  // the format is /sync/:collection/:id and not /:collection/:sync/:id to
  // match firebase urls. the key in firebase is /:collection/:id
  router.get(`${root}/sync/:collection/:id*`, auth, sync({
    hasPermission,
    hooks,
    setCreated,
    setLastModified,
  }));

  // db.collection.find
  router.get(`${root}/:collection/find`, auth, find({
    cache,
    hasPermission,
    hooks,
    limitDefault,
    limitMax,
  }));

  // db.collection.findOne
  router.get(`${root}/:collection/findOne`, auth, findOne(root, router));

  // db.collection.findById
  router.get(`${root}/:collection/:id*`, auth, findById(root, router));


  // middleware
  return async (req, res, next) => {
    const db = await connectMongo(mongoDbConfig);
    req.db = db;
    req.primaryFirebaseShard = primaryFirebaseShard;
    req.fbAdminPrimary = fbAdminShards[primaryFirebaseShard];
    req.fbAdminShards = fbAdminShards;
    req.mongoFbAdmin = {
      createObject: createObjectGenerator({ db, fbAdminShards }),
      editObject: editObjectGenerator({ db, fbAdminShards }),
    };

    // execute routes
    return router.handle(req, res, next);
  };
};

export default { server };

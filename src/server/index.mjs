/* eslint-disable no-underscore-dangle */

// dependencies
import assert from 'assert';
import express from 'express';
import mongodb from 'mongodb';
import Cache from 'dobi-cache-2';
import {
  find,
  findById,
  findOne,
  fixQueryParameters,
  getMongoFbScript,
  sync,
} from './routes';
import {
  AdminTokenGenerator,
  auth,
  connect,
  hasPermission as hasPermissionHelper,
} from './helpers';
import * as mongoFbClient from '../client';


export const client = mongoFbClient;
export const { ObjectID } = mongodb;

/**
 *
 * @param {Object} config
 * @param {Object} config.cache
 * @param {boolean} config.cache.enabled=true
 * @param {number} config.cache.max=100
 * @param {string} config.cache.redisUri=localhost
 * @param {Object} config.firebase
 * @param {string} config.firebase.apiKey
 * @param {Object} config.firebase.credential
 * @param {string} config.firebase.databaseURL
 * @param {Object} config.hooks
 * @param {Object} config.mongodb
 * @param {Object} config.options
 * @param {string[]} config.options.blacklist=[] array of blocked collections
 * @param {number} config.options.limitDefault=20 default limit of query response
 * @param {number} config.options.limitMax=1000 max returned results
 * @param {boolean} config.options.setCreated=true
 * @param {boolean} config.options.setLastModified=true
 * @param {boolean} config.options.useObjectId=true
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
    firebase: firebaseConfig = {},
    hooks = {},
    mongodb: mongoDbConfig = {},
    options: {
      blacklist = [],
      limitDefault = 20,
      limitMax = 1000,
      setCreated = true,
      setLastModified = true,
      useObjectId = true,
    } = {},
    root = '/api',
  } = config;

  assert(firebaseConfig.credential, 'firebase.credential required in config');

  const adminTokenGenerator = new AdminTokenGenerator(firebaseConfig.credential);

  const { cache } = new Cache({
    enabled,
    lruMaxItems: max,
    redisUri,
  });

  // connect to firebase and mongodb
  connect({
    firebase: firebaseConfig,
    mongodb: mongoDbConfig,
  });

  const hasPermission = hasPermissionHelper(blacklist);

  // build routes
  const router = express.Router();

  // fix query parameters
  router.use(`${root}/*`, fixQueryParameters);

  // mongoFbClient javascript
  router.get(`${root}/mongofb.js`, getMongoFbScript({ cache, minified: false }));
  router.get(`${root}/mongofb.min.js`, getMongoFbScript({ cache, minified: true }));

  // firebase url
  router.get(`${root}/Firebase`, (req, res) => res.send(firebaseConfig.url));


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
    useObjectId,
  }));

  // db.collection.find
  router.get(`${root}/:collection/find`, auth, find({
    cache,
    hasPermission,
    hooks,
    limitDefault,
    limitMax,
    useObjectId,
  }));

  // db.collection.findOne
  router.get(`${root}/:collection/findOne`, auth, findOne(root, router));

  // db.collection.findById
  router.get(`${root}/:collection/:id*`, auth, findById(root, router));


  // middleware
  return async (req, res, next) => {
    const { db, fbAdmin } = await connect({
      firebase: firebaseConfig,
      mongodb: mongoDbConfig,
    });

    req.generateAdminToken = adminTokenGenerator.get.bind(adminTokenGenerator);
    req.db = db;
    req.fbAdmin = fbAdmin;
    req.mongofb = new mongoFbClient.Database({
      api: root,
      firebase: {
        apiKey: firebaseConfig.apiKey,
        databaseURL: firebaseConfig.databaseURL,
      },
    });

    // execute routes
    return router.handle(req, res, next);
  };
};

export default {
  server,
};

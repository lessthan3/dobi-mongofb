/* eslint-disable no-underscore-dangle */

// dependencies
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
  auth as authHelper,
  connect,
  hasPermission as hasPermissionHelper,
} from './helpers';
import * as mongoFbClient from '../client';


export const client = mongoFbClient;
export const { ObjectID } = mongodb;

// exports
export const server = (cfg) => {
  // configuration
  const {
    cache: {
      enabled = true,
      max = 100,
      redisUri = 'localhost',
    } = {},
    firebase = {},
    hooks = {},
    mongodb: mongoDbConfig = {},
    options: {
      blacklist = [],
      limit_default: limitDefault = 20,
      limit_max: limitMax = 1000,
      set_created: setCreated = true,
      set_last_modified: setLastModified = true,
      use_objectid: useObjectId = true,
    } = {},
    root = '/api',
  } = cfg;

  const firebaseConfig = {
    secret: null,
    url: 'https://shining-fire-369.firebaseio.com/',
    ...firebase,
  };

  const { cache } = new Cache({
    enabled,
    lruMaxItems: max,
    redisUri,
  });

  // connect to firebase and mongodb
  connect({
    firebase: firebaseConfig,
    mongdb: mongoDbConfig,
  });

  const auth = authHelper(firebaseConfig);
  const hasPermission = hasPermissionHelper({ blacklist, firebaseConfig });

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
    const { db, fb } = await connect({
      firebase: firebaseConfig,
      mongodb: mongoDbConfig,
    });

    req.db = db;
    req.fb = fb;
    req.mongofb = new mongoFbClient.Database({
      firebase: firebaseConfig.url,
      server: `http://${req.get('host')}${root}`,
    });

    // execute routes
    return router.handle(req, res, next);
  };
};

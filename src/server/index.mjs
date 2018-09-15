/* eslint-disable no-underscore-dangle */


// dependencies
import express from 'express';
import fs from 'fs';
import jwt from 'jwt-simple';
import LRU from 'lru-cache';
import merge from 'deepmerge';
import mongodb from 'mongodb';
import connect from './connect';
import * as mongoFbClient from '../client';
import { dirname } from './dirname';

export const client = mongoFbClient;

export const { ObjectID } = mongodb;

// exports
export const server = (_cfg) => {
  let cfg = _cfg;
  // configuration
  cfg = merge({
    cache: {
      enabled: true,
      max: 100,
      maxAge: 1000 * 60 * 5,
    },
    firebase: {
      secret: null,
      url: 'https://shining-fire-369.firebaseio.com/',
    },
    mongodb: {
      db: 'test',
      host: 'localhost',
      options: {
        autoReconnect: true,
        keepAlive: 120,
        native_parser: false,
        poolSize: 1,
        useNewUrlParser: true,
      },
      pass: 'testPassword',
      port: 27017,
      user: 'testUser',
    },
    options: {
      blacklist: [],
      limit_default: 20,
      limit_max: 1000,
      set_created: true,
      set_last_modified: true,
      use_objectid: true,
    },
    root: '/api',
  }, cfg);

  // connect to firebase and mongodb
  connect(cfg);

  // middleware
  return async (_parentReq, _parentRes, next) => {
    const { db, fb } = await connect(cfg);

    const parentReq = _parentReq;
    const parentRes = _parentRes;

    // databases
    parentReq.db = db;
    parentReq.fb = fb;
    parentReq.mongofb = new mongoFbClient.Database({
      firebase: cfg.firebase.url,
      server: `http://${parentReq.get('host')}${cfg.root}`,
    });

    // helpers
    const auth = (req, res, callback) => {
      const token = req.query.token || req.body.token;
      if (token && cfg.firebase) {
        try {
          const payload = jwt.decode(token, cfg.firebase.secret);
          req.user = payload.d;
          req.admin = payload.admin;
        } catch (authErr) {
          req.token_parse_error = authErr;
        }
      }
      return (
        typeof callback === 'function' ? callback() : undefined
      );
    };

    const hasPermission = () => {
      auth(parentReq, parentRes);
      if (parentReq.admin) {
        return true;
      }
      return !cfg.options.blacklist.includes(parentReq.params.collection);
    };

    const _cache = new LRU(cfg.cache);
    const cache = (fn) => {
      let maxAge = cfg.cache.maxAge / 1000;
      if (parentReq.query.bust === '1') {
        maxAge = 0;
      }
      let val = 'private, max-age=0, no-cache, no-store, must-revalidate';
      if (cfg.cache.enabled && (maxAge > 0)) {
        val = `public, max-age=${maxAge}, must-revalidate`;
      }
      parentRes.set('Cache-Control', val);
      const key = parentReq.url.replace('&bust=1', '');
      if (parentReq.query.bust === '1') {
        _cache.del(key);
        delete parentReq.query.bust;
      }
      if (cfg.cache.enabled && _cache.has(key)) {
        return parentRes.send(_cache.get(key));
      }
      delete parentReq.query._;
      return fn((data) => {
        _cache.set(key, data);
        return parentRes.send(data);
      });
    };

    const contentType = type => parentRes.set('Content-Type', type);

    const handleError = (handleErr) => {
      contentType('text/plain');
      return parentRes.status(400).send(handleErr.toString());
    };

    const hook = (time, method, _args) => {
      let args = _args;
      let fn;
      const { collection } = parentReq.params;
      if (
        cfg.hooks
        && cfg.hooks[collection]
        && cfg.hooks[collection]
        && cfg.hooks[collection][time]
        && cfg.hooks[collection][time][method]
      ) {
        fn = cfg.hooks[collection][time][method];
        if (!Array.isArray(args)) {
          args = [args];
        }
        return fn.apply(parentReq, args);
      }
      return args;
    };

    // routes
    const router = express.Router();

    // fix query parameters
    router.use(`${cfg.root}/*`, (req, res, callback) => {
      const map = {
        false: false,
        null: null,
        true: true,
      };

      for (const k of Object.keys(req.query)) {
        const v = req.query[k];
        if (Object.keys(map).includes(v)) {
          req.query[k] = map[v];
        }
      }
      return callback();
    });

    // mongoFbClient javascript
    router.get(`${cfg.root}/mongofb.js`, () => {
      contentType('text/javascript');
      return cache((callback) => {
        try {
          const script = fs.readFileSync(`${dirname}/../../dist/client.js`, 'utf-8');
          return callback(script);
        } catch (readErr) {
          return handleError(readErr);
        }
      });
    });

    // mongoFbClient javascript minified
    router.get(`${cfg.root}/mongofb.min.js`, () => {
      contentType('text/javascript');
      return cache((callback) => {
        try {
          const script = fs.readFileSync(`${dirname}/../../dist/client.min.js`, 'utf-8');
          return callback(script);
        } catch (readErr) {
          return handleError(readErr);
        }
      });
    });

    // firebase url
    router.get(`${cfg.root}/Firebase`, (req, res) => res.send(cfg.firebase.url));


    // ObjectID for creating documents
    router.get(`${cfg.root}/ObjectID`, (req, res) => res.send(mongodb.ObjectID().toString()));

    // sync data from firebase
    // NOTE: requires _id to be an ObjectID
    // db.collection.update
    // db.collection.insert
    // db.collection.remove
    // the format is /sync/:collection/:id and not /:collection/:sync/:id to
    // match firebase urls. the key in firebase is /:collection/:id
    let url = `${cfg.root}/sync/:collection/:id*`;
    router.get(url, auth, (_req, _res) => {
      const req = _req;
      const res = _res;
      const collection = db.collection(req.params.collection);

      // get data
      const ref = fb.child(`${req.params.collection}/${req.params.id}`);
      return ref.once('value', (snapshot) => {
        let qry;
        const doc = snapshot.val();

        // convert _id if using ObjectIDs
        if (cfg.options.use_objectid) {
          try {
            qry = { _id: new mongodb.ObjectID(req.params.id) };
          } catch (error) {
            return handleError('Invalid ObjectID');
          }
        }

        // send null if collection in blacklist
        // WARNING: IF YOU ATTEMPT TO SYNC A COLLECTION ITEM NOT
        // ON YOUR FIREBASE AND CALL SYNC, IT WILL GET DESTROYED
        if (!hasPermission()) {
          return res.send(null);
        }

        // insert/update
        if (doc) {
          // set created
          if (cfg.options.set_created) {
            if (doc.created == null) {
              doc.created = Date.now();
            }
          }

          // set last modified
          if (cfg.options.set_last_modified) {
            doc.last_modified = Date.now();
          }

          doc._id = qry._id;
          const opt = { upsert: true };
          return collection.updateOne(qry, { $set: doc }, opt, (updateErr) => {
            if (updateErr) {
              return handleError(updateErr);
            }
            hook('after', 'find', doc);
            return res.send(doc);
          });

          // remove
        }
        return collection.removeOne(qry, (removeErr) => {
          if (removeErr) {
            return handleError(removeErr);
          }
          return res.sendStatus(200);
        });
      });
    });


    // db.collection.find
    url = `${cfg.root}/:collection/find`;
    router.get(url, auth, (_req, _res) => cache((callback) => {
      const req = _req;
      const res = _res;

      // special options (mainly for use by findByID and findOne)
      const __single = req.query.__single || false;
      let __field = null;
      if (req.query.__field) {
        __field = decodeURIComponent(req.query.__field).replace(/\//g, '.');
      }
      delete req.query.__single;
      delete req.query.__field;

      // defaults
      let criteria = {};
      let fields = {};
      let options = {};

      // use JSON encoded parameters
      if (req.query.criteria || req.query.options) {
        if (req.query.criteria) {
          try {
            criteria = JSON.parse(req.query.criteria);
          } catch (error) {
            return handleError('invalid criteria');
          }
        }

        if (req.query.fields) {
          try {
            fields = JSON.parse(req.query.fields);
          } catch (error) {
            return handleError('invalid fields');
          }
        }

        if (req.query.options) {
          try {
            options = JSON.parse(req.query.options);
          } catch (error) {
            return handleError('invalid options');
          }
        }

        // simple http queries
      } else {
        if (req.query.fields) {
          for (const field of req.query.fields.split(',')) {
            fields[field] = 1;
          }
          delete req.query.fields;
        }

        if (req.query.limit) {
          options.limit = req.query.limit;
          delete req.query.limit;
        }

        if (req.query.skip) {
          options.skip = req.query.skip;
          delete req.query.skip;
        }

        if (req.query.sort) {
          const [sortField, sortDir] = req.query.sort.split(',');
          options.sort = [[sortField, sortDir || 'asc']];
          delete req.query.sort;
        }

        criteria = req.query;
      }

      if (__single) {
        options.limit = 1;
      }

      // built-in hooks
      if (cfg.options.use_objectid) {
        try {
          if (criteria._id) {
            if (typeof criteria._id === 'string') {
              criteria._id = new mongodb.ObjectID(criteria._id);
            } else if (criteria._id.$in) {
              const ids = criteria._id.$in;
              criteria._id.$in = (
                ids.map(id => new mongodb.ObjectID(id))
              );
            }
          }
        } catch (error3) {
          return handleError('Invalid ObjectID');
        }
      }
      if (cfg.options.limit_default) {
        if (options.limit == null) {
          options.limit = cfg.options.limit_default;
        }
      }
      if (cfg.options.limit_max) {
        options.limit = Math.min(options.limit, cfg.options.limit_max);
      }

      // don't allow $where clauses in the criteria
      if (criteria.$where) {
        return res.send(403, 'use of the $where operator is not allowed');
      }

      // dont make a DB call for blacklist
      // as mongo errors can be revealing
      if (!hasPermission()) {
        if (__single) {
          return res.sendStatus(404);
        }
        return callback([]);
      }

      // hooks
      hook('before', 'find', [criteria, fields, options]);

      // run query
      const collection = db.collection(req.params.collection);
      if (Object.keys(fields).length > 0) {
        options.projection = fields;
      }
      return collection.find(criteria, options).toArray((findErr, _docs) => {
        let docs = _docs;
        let doc;
        if (findErr) {
          return handleError(findErr);
        }
        for (doc of docs) {
          hook('after', 'find', doc);
        }

        if (__field) {
          const fn = (_o) => {
            let o = _o;
            for (const key of __field.split('.')) {
              o = o != null ? o[key] : undefined;
            }
            return o;
          };
          docs = docs.map(item => fn(item));
        }
        if (__single) {
          if (docs.length === 0) {
            return res.sendStatus(404);
          }
          [docs] = docs;
        }
        return callback(docs);
      });
    }));

    // db.collection.findOne
    url = `${cfg.root}/:collection/findOne`;
    router.get(url, auth, (_req, _res, getNext) => {
      const req = _req;
      const res = _res;
      req.url = `${cfg.root}/${req.params.collection}/find`;
      req.query.__single = true;
      return router.handle(req, res, getNext);
    });


    // db.collection.findById
    url = `${cfg.root}/:collection/:id*`;
    router.get(url, auth, (_req, _res, getCallback) => {
      const req = _req;
      const res = _res;
      req.url = `${cfg.root}/${req.params.collection}/find`;
      req.query.criteria = JSON.stringify({ _id: req.params.id });
      req.query.__single = true;
      if (req.params[1]) {
        const [, field] = req.params;
        req.query.__field = field;
      }
      return router.handle(req, res, getCallback);
    });

    // execute routes
    return router.handle(parentReq, parentRes, next);
  };
};

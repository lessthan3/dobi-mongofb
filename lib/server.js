// Generated by CoffeeScript 1.10.0
(function() {
  var Firebase, FirebaseTokenGenerator, LRU, crypto, express, jwt, merge, mongodb, wrap,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  crypto = require('crypto');

  express = require('express');

  Firebase = require('firebase');

  FirebaseTokenGenerator = require('firebase-token-generator');

  jwt = require('jwt-simple');

  LRU = require('lru-cache');

  merge = require('deepmerge');

  mongodb = require('mongodb');

  wrap = require('dobi-asset-wrap');

  exports.ObjectID = mongodb.ObjectID;

  exports.client = require('./client');

  exports.server = function(cfg) {
    var connect, db, fb;
    cfg = merge({
      root: '/api',
      cache: {
        enabled: true,
        max: 100,
        maxAge: 1000 * 60 * 5
      },
      firebase: {
        url: 'https://vn42xl9zsez.firebaseio-demo.com/',
        secret: null
      },
      mongodb: {
        db: 'test',
        host: 'localhost',
        pass: '',
        port: 27017,
        user: 'admin',
        options: {
          native_parser: false,
          autoReconnect: true,
          poolSize: 1,
          keepAlive: 120
        }
      },
      options: {
        blacklist: [],
        limit_default: 20,
        limit_max: 1000,
        set_created: true,
        set_last_modified: true,
        use_objectid: true
      }
    }, cfg);
    exports.db = null;
    exports.fb = null;
    db = null;
    fb = null;
    connect = function(next) {
      var m, url;
      if (db && fb) {
        return typeof next === "function" ? next() : void 0;
      }
      m = cfg.mongodb;
      url = "mongodb://" + m.user + ":" + m.pass + "@" + m.host + ":" + m.port + "/" + m.db;
      url = url.replace(':@', '@');
      return mongodb.MongoClient.connect(url, m.options, function(err, database) {
        var token, token_generator;
        if (err) {
          return typeof next === "function" ? next(err) : void 0;
        }
        db = database;
        db.ObjectID = mongodb.ObjectID;
        exports.db = db;
        fb = new Firebase(cfg.firebase.url);
        if (cfg.firebase.secret) {
          token_generator = new FirebaseTokenGenerator(cfg.firebase.secret);
          token = token_generator.createToken({}, {
            expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
            admin: true
          });
          return fb.authWithCustomToken(token, function(err) {
            fb.admin_token = token;
            if (typeof next === "function") {
              next(err);
            }
            return exports.fb = fb;
          });
        } else {
          return typeof next === "function" ? next() : void 0;
        }
      });
    };
    connect();
    return function(req, res, next) {
      return connect(function(err) {
        var _cache, auth, cache, contentType, handleError, hasPermission, hook, router, url;
        if (err) {
          return next(err);
        }
        req.db = db;
        req.fb = fb;
        req.mongofb = new exports.client.Database({
          server: "http://" + (req.get('host')) + cfg.root,
          firebase: cfg.firebase.url
        });
        auth = function(req, res, next) {
          var error, payload, ref1, ref2, token;
          token = ((ref1 = req.query) != null ? ref1.token : void 0) || ((ref2 = req.body) != null ? ref2.token : void 0);
          if (token && cfg.firebase) {
            try {
              payload = jwt.decode(token, cfg.firebase.secret);
              req.user = payload.d;
              req.admin = payload.admin;
            } catch (error) {
              err = error;
              req.token_parse_error = err;
            }
          }
          return typeof next === "function" ? next() : void 0;
        };
        hasPermission = function() {
          var ref1;
          auth(req, res);
          if (req.admin) {
            return true;
          } else if (ref1 = req.params.collection, indexOf.call(cfg.options.blacklist, ref1) >= 0) {
            return false;
          } else {
            return true;
          }
        };
        _cache = new LRU(cfg.cache);
        cache = function(fn) {
          var key, max_age, val;
          max_age = cfg.cache.maxAge / 1000;
          if (req.query.bust === '1') {
            max_age = 0;
          }
          val = 'private, max-age=0, no-cache, no-store, must-revalidate';
          if (cfg.cache.enabled && max_age > 0) {
            val = "public, max-age=" + max_age + ", must-revalidate";
          }
          res.set('Cache-Control', val);
          key = req.url.replace('&bust=1', '');
          if (req.query.bust === '1') {
            _cache.del(key);
            delete req.query.bust;
          }
          if (cfg.cache.enabled && _cache.has(key)) {
            return res.send(_cache.get(key));
          }
          delete req.query._;
          return fn(function(data) {
            _cache.set(key, data);
            return res.send(data);
          });
        };
        contentType = function(type) {
          return res.set('Content-Type', type);
        };
        handleError = function(err) {
          contentType('text/plain');
          return res.send(400, err.toString());
        };
        hook = function(time, method, args) {
          var fn, ref1, ref2, ref3;
          fn = (ref1 = cfg.hooks) != null ? (ref2 = ref1[req.params.collection]) != null ? (ref3 = ref2[time]) != null ? ref3[method] : void 0 : void 0 : void 0;
          if (fn) {
            if (!Array.isArray(args)) {
              args = [args];
            }
            return fn.apply(req, args);
          } else {
            return args;
          }
        };
        router = express.Router();
        router.get(cfg.root + "/*", function(req, res, next) {
          var k, map, ref1, v;
          map = {
            'false': false,
            'true': true,
            'null': null
          };
          ref1 = req.query;
          for (k in ref1) {
            v = ref1[k];
            if (v in map) {
              req.query[k] = map[v];
            }
          }
          return next();
        });
        router.get(cfg.root + "/mongofb.js", function(req, res, next) {
          contentType('text/javascript');
          return cache(function(next) {
            var asset;
            return asset = new wrap.Snockets({
              src: __dirname + "/client.js"
            }, function(err) {
              if (err) {
                return handleError(err);
              }
              return next(asset.data);
            });
          });
        });
        router.get(cfg.root + "/mongofb.min.js", function(req, res, next) {
          contentType('text/javascript');
          return cache(function(next) {
            var asset;
            return asset = new wrap.Snockets({
              src: __dirname + "/client.js",
              minify: true
            }, function(err) {
              if (err) {
                return handleError(err);
              }
              return next(asset.data);
            });
          });
        });
        router.get(cfg.root + "/Firebase", function(req, res, next) {
          return res.send(cfg.firebase.url);
        });
        router.get(cfg.root + "/ObjectID", function(req, res, next) {
          return res.send(mongodb.ObjectID().toString());
        });
        url = cfg.root + "/sync/:collection/:id*";
        router.get(url, auth, function(req, res, next) {
          var collection, ref;
          collection = db.collection(req.params.collection);
          ref = fb.child(req.params.collection + "/" + req.params.id);
          return ref.once('value', function(snapshot) {
            var doc, error, opt, qry;
            doc = snapshot.val();
            if (cfg.options.use_objectid) {
              try {
                qry = {
                  _id: new mongodb.ObjectID(req.params.id)
                };
              } catch (error) {
                err = error;
                return handleError('Invalid ObjectID');
              }
            }
            if (!hasPermission()) {
              return res.send(null);
            }
            if (doc) {
              if (cfg.options.set_created) {
                if (doc.created == null) {
                  doc.created = Date.now();
                }
              }
              if (cfg.options.set_last_modified) {
                doc.last_modified = Date.now();
              }
              doc._id = qry._id;
              opt = {
                safe: true,
                upsert: true
              };
              return collection.update(qry, doc, opt, function(err) {
                if (err) {
                  return handleError(err);
                }
                hook('after', 'find', doc);
                return res.send(doc);
              });
            } else {
              return collection.remove(qry, function(err) {
                if (err) {
                  return handleError(err);
                }
                return res.send(null);
              });
            }
          });
        });
        url = cfg.root + "/:collection/find";
        router.get(url, auth, function(req, res, next) {
          return cache(function(next) {
            var __field, __single, collection, criteria, error, error1, error2, error3, field, fields, i, id, ids, len, options, ref1, ref2, sort_dir, sort_field;
            __single = req.query.__single || false;
            __field = null;
            if (req.query.__field) {
              __field = unescape(req.query.__field).replace(/\//g, '.');
            }
            delete req.query.__single;
            delete req.query.__field;
            criteria = {};
            fields = {};
            options = {};
            if (req.query.criteria || req.query.options) {
              if (req.query.criteria) {
                try {
                  criteria = JSON.parse(req.query.criteria);
                } catch (error) {
                  err = error;
                  return handleError('invalid criteria');
                }
              }
              if (req.query.fields) {
                try {
                  fields = JSON.parse(req.query.fields);
                } catch (error1) {
                  err = error1;
                  return handleError('invalid fields');
                }
              }
              if (req.query.options) {
                try {
                  options = JSON.parse(req.query.options);
                } catch (error2) {
                  err = error2;
                  return handleError('invalid options');
                }
              }
            } else {
              if (req.query.fields) {
                ref1 = req.query.fields.split(',');
                for (i = 0, len = ref1.length; i < len; i++) {
                  field = ref1[i];
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
                ref2 = req.query.sort.split(','), sort_field = ref2[0], sort_dir = ref2[1];
                options.sort = [[sort_field, sort_dir || 'asc']];
                delete req.query.sort;
              }
              criteria = req.query;
            }
            if (__single) {
              options.limit = 1;
            }
            if (cfg.options.use_objectid) {
              try {
                if (criteria._id) {
                  if (typeof criteria._id === 'string') {
                    criteria._id = new mongodb.ObjectID(criteria._id);
                  } else if (criteria._id.$in) {
                    ids = criteria._id.$in;
                    criteria._id.$in = (function() {
                      var j, len1, results;
                      results = [];
                      for (j = 0, len1 = ids.length; j < len1; j++) {
                        id = ids[j];
                        results.push(new mongodb.ObjectID(id));
                      }
                      return results;
                    })();
                  }
                }
              } catch (error3) {
                err = error3;
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
            if (criteria.$where) {
              return res.send(403, 'use of the $where operator is not allowed');
            }
            if (!hasPermission()) {
              if (__single) {
                return res.send(404);
              }
              return next([]);
            }
            hook('before', 'find', [criteria, fields, options]);
            collection = db.collection(req.params.collection);
            return collection.find(criteria, fields, options).toArray(function(err, docs) {
              var doc, fn, j, len1;
              if (err) {
                return handleError(err);
              }
              for (j = 0, len1 = docs.length; j < len1; j++) {
                doc = docs[j];
                hook('after', 'find', doc);
              }
              if (__field) {
                fn = function(o) {
                  var key, l, len2, ref3;
                  ref3 = __field.split('.');
                  for (l = 0, len2 = ref3.length; l < len2; l++) {
                    key = ref3[l];
                    o = o != null ? o[key] : void 0;
                  }
                  return o;
                };
                docs = (function() {
                  var l, len2, results;
                  results = [];
                  for (l = 0, len2 = docs.length; l < len2; l++) {
                    doc = docs[l];
                    results.push(fn(doc));
                  }
                  return results;
                })();
              }
              if (__single) {
                if (docs.length === 0) {
                  return res.send(404);
                }
                docs = docs[0];
              }
              return next(docs);
            });
          });
        });
        url = cfg.root + "/:collection/findOne";
        router.get(url, auth, function(req, res, next) {
          req.url = cfg.root + "/" + req.params.collection + "/find";
          req.query.__single = true;
          return router.handle(req, res, next);
        });
        url = cfg.root + "/:collection/:id*";
        router.get(url, auth, function(req, res, next) {
          req.url = cfg.root + "/" + req.params.collection + "/find";
          req.query.criteria = JSON.stringify({
            _id: req.params.id
          });
          req.query.__single = true;
          if (req.params[1]) {
            req.query.__field = req.params[1];
          }
          return router.handle(req, res, next);
        });
        return router.handle(req, res, next);
      });
    };
  };

}).call(this);
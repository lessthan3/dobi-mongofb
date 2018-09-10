"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.server = exports.ObjectID = exports.client = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _express = _interopRequireDefault(require("express"));

var _firebase = _interopRequireDefault(require("firebase"));

var _firebaseTokenGenerator = _interopRequireDefault(require("firebase-token-generator"));

var _fs = _interopRequireDefault(require("fs"));

var _jwtSimple = _interopRequireDefault(require("jwt-simple"));

var _lruCache = _interopRequireDefault(require("lru-cache"));

var _deepmerge = _interopRequireDefault(require("deepmerge"));

var _mongodb = _interopRequireDefault(require("mongodb"));

var mongoFbClient = _interopRequireDefault(require("../client"));

var _dirname = require("./dirname");

/* eslint-disable no-underscore-dangle */
// dependencies
var client = mongoFbClient;
exports.client = client;
var ObjectID = _mongodb.default.ObjectID; // exports

exports.ObjectID = ObjectID;

var server = function server(_cfg) {
  var cfg = _cfg; // configuration

  cfg = (0, _deepmerge.default)({
    cache: {
      enabled: true,
      max: 100,
      maxAge: 1000 * 60 * 5
    },
    firebase: {
      secret: null,
      url: 'https://shining-fire-369.firebaseio.com/'
    },
    mongodb: {
      db: 'test',
      host: 'localhost',
      options: {
        autoReconnect: true,
        keepAlive: 120,
        native_parser: false,
        poolSize: 1
      },
      pass: 'testPassword',
      port: 27017,
      user: 'testUser'
    },
    options: {
      blacklist: [],
      limit_default: 20,
      limit_max: 1000,
      set_created: true,
      set_last_modified: true,
      use_objectid: true
    },
    root: '/api'
  }, cfg); // variables

  var db = null;
  var fb = null; // connect to firebase and mongodb

  var connect = function connect(_next) {
    var next = _next;

    if (typeof next !== 'function') {
      next = function next() {};
    }

    if (db && fb) {
      return next();
    }

    var _cfg$mongodb = cfg.mongodb,
        database = _cfg$mongodb.db,
        host = _cfg$mongodb.host,
        options = _cfg$mongodb.options,
        pass = _cfg$mongodb.pass,
        port = _cfg$mongodb.port,
        user = _cfg$mongodb.user;
    var url = "mongodb://".concat(user, ":").concat(pass, "@").concat(host, ":").concat(port, "/").concat(database).replace(':@', '@');
    return _mongodb.default.MongoClient.connect(url, options, function (err, mongoClient) {
      if (err) {
        return next(err);
      }

      db = mongoClient.db(database);
      db.ObjectID = _mongodb.default.ObjectID;
      fb = new _firebase.default(cfg.firebase.url);

      if (cfg.firebase.secret) {
        var tokenGenerator = new _firebaseTokenGenerator.default(cfg.firebase.secret);
        var token = tokenGenerator.createToken({}, {
          admin: true,
          expires: Date.now() + 1000 * 60 * 60 * 24 * 30
        });
        return fb.authWithCustomToken(token, function (authErr) {
          if (authErr) {
            return next(authErr);
          }

          fb.admin_token = token;
          return next();
        });
      }

      return next();
    });
  };

  connect(); // middleware

  return function (_parentReq, _parentRes, next) {
    return connect(function (_err) {
      var parentReq = _parentReq;
      var parentRes = _parentRes;
      var err = _err;

      if (err) {
        return next(err);
      } // databases


      parentReq.db = db;
      parentReq.fb = fb;
      parentReq.mongofb = new mongoFbClient.Database({
        firebase: cfg.firebase.url,
        server: "http://".concat(parentReq.get('host')).concat(cfg.root)
      }); // helpers

      var auth = function auth(req, res, callback) {
        var token = req.query.token || req.body.token;

        if (token && cfg.firebase) {
          try {
            var payload = _jwtSimple.default.decode(token, cfg.firebase.secret);

            req.user = payload.d;
            req.admin = payload.admin;
          } catch (authErr) {
            req.token_parse_error = authErr;
          }
        }

        return typeof callback === 'function' ? callback() : undefined;
      };

      var hasPermission = function hasPermission() {
        auth(parentReq, parentRes);

        if (parentReq.admin) {
          return true;
        }

        if (Array.from(cfg.options.blacklist).includes(parentReq.params.collection)) {
          return false;
        }

        return true;
      };

      var _cache = new _lruCache.default(cfg.cache);

      var cache = function cache(fn) {
        var maxAge = cfg.cache.maxAge / 1000;

        if (parentReq.query.bust === '1') {
          maxAge = 0;
        }

        var val = 'private, max-age=0, no-cache, no-store, must-revalidate';

        if (cfg.cache.enabled && maxAge > 0) {
          val = "public, max-age=".concat(maxAge, ", must-revalidate");
        }

        parentRes.set('Cache-Control', val);
        var key = parentReq.url.replace('&bust=1', '');

        if (parentReq.query.bust === '1') {
          _cache.del(key);

          delete parentReq.query.bust;
        }

        if (cfg.cache.enabled && _cache.has(key)) {
          return parentRes.send(_cache.get(key));
        }

        delete parentReq.query._;
        return fn(function (data) {
          _cache.set(key, data);

          return parentRes.send(data);
        });
      };

      var contentType = function contentType(type) {
        return parentRes.set('Content-Type', type);
      };

      var handleError = function handleError(handleErr) {
        contentType('text/plain');
        return parentRes.status(400).send(handleErr.toString());
      };

      var hook = function hook(time, method, _args) {
        var args = _args;
        var fn;
        var collection = parentReq.params.collection;

        if (cfg.hooks && cfg.hooks[collection] && cfg.hooks[collection] && cfg.hooks[collection][time] && cfg.hooks[collection][time][method]) {
          fn = cfg.hooks[collection][time][method];

          if (Array.isArray(args)) {
            args = [args];
          }

          return fn.apply(parentReq, args);
        }

        return args;
      }; // routes


      var router = _express.default.Router(); // fix query parameters


      router.use("".concat(cfg.root, "/*"), function (req, res, callback) {
        var map = {
          false: false,
          null: null,
          true: true
        };

        var _arr = Object.keys(req.query);

        for (var _i = 0; _i < _arr.length; _i++) {
          var k = _arr[_i];
          var v = req.query[k];

          if (Object.keys(map).includes(v)) {
            req.query[k] = map[v];
          }
        }

        return callback();
      }); // mongoFbClient javascript

      router.get("".concat(cfg.root, "/mongofb.js"), function () {
        contentType('text/javascript');
        return cache(function (callback) {
          try {
            var script = _fs.default.readFileSync("".concat(_dirname.dirname, "/../../dist/client.js"), 'utf-8');

            return callback(script);
          } catch (readErr) {
            return handleError(readErr);
          }
        });
      }); // mongoFbClient javascript minified

      router.get("".concat(cfg.root, "/mongofb.min.js"), function () {
        contentType('text/javascript');
        return cache(function (callback) {
          try {
            var script = _fs.default.readFileSync("".concat(_dirname.dirname, "/../../dist/client.min.js"), 'utf-8');

            return callback(script);
          } catch (readErr) {
            return handleError(readErr);
          }
        });
      }); // firebase url

      router.get("".concat(cfg.root, "/Firebase"), function (req, res) {
        return res.send(cfg.firebase.url);
      }); // ObjectID for creating documents

      router.get("".concat(cfg.root, "/ObjectID"), function (req, res) {
        return res.send(_mongodb.default.ObjectID().toString());
      }); // sync data from firebase
      // NOTE: requires _id to be an ObjectID
      // db.collection.update
      // db.collection.insert
      // db.collection.remove
      // the format is /sync/:collection/:id and not /:collection/:sync/:id to
      // match firebase urls. the key in firebase is /:collection/:id

      var url = "".concat(cfg.root, "/sync/:collection/:id*");
      router.get(url, auth, function (_req, _res) {
        var req = _req;
        var res = _res;
        var collection = db.collection(req.params.collection); // get data

        var ref = fb.child("".concat(req.params.collection, "/").concat(req.params.id));
        return ref.once('value', function (snapshot) {
          var qry;
          var doc = snapshot.val(); // convert _id if using ObjectIDs

          if (cfg.options.use_objectid) {
            try {
              qry = {
                _id: new _mongodb.default.ObjectID(req.params.id)
              };
            } catch (error) {
              err = error;
              return handleError('Invalid ObjectID');
            }
          } // send null if collection in blacklist
          // WARNING: IF YOU ATTEMPT TO SYNC A COLLECTION ITEM NOT
          // ON YOUR FIREBASE AND CALL SYNC, IT WILL GET DESTROYED


          if (!hasPermission()) {
            return res.send(null);
          } // insert/update


          if (doc) {
            // set created
            if (cfg.options.set_created) {
              if (doc.created == null) {
                doc.created = Date.now();
              }
            } // set last modified


            if (cfg.options.set_last_modified) {
              doc.last_modified = Date.now();
            }

            doc._id = qry._id;
            var opt = {
              safe: true,
              upsert: true
            };
            return collection.update(qry, doc, opt, function (updateErr) {
              if (updateErr) {
                return handleError(updateErr);
              }

              hook('after', 'find', doc);
              return res.send(doc);
            }); // remove
          }

          return collection.remove(qry, function (removeErr) {
            if (removeErr) {
              return handleError(removeErr);
            }

            return res.send(null);
          });
        });
      }); // db.collection.find

      url = "".concat(cfg.root, "/:collection/find");
      router.get(url, auth, function (_req, _res) {
        return cache(function (callback) {
          var req = _req;
          var res = _res; // special options (mainly for use by findByID and findOne)

          var __single = req.query.__single || false;

          var __field = null;

          if (req.query.__field) {
            __field = decodeURIComponent(req.query.__field).replace(/\//g, '.');
          }

          delete req.query.__single;
          delete req.query.__field; // defaults

          var criteria = {};
          var fields = {};
          var options = {}; // use JSON encoded parameters

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
            } // simple http queries

          } else {
            if (req.query.fields) {
              var _iteratorNormalCompletion = true;
              var _didIteratorError = false;
              var _iteratorError = undefined;

              try {
                for (var _iterator = req.query.fields.split(',')[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  var field = _step.value;
                  fields[field] = 1;
                }
              } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion && _iterator.return != null) {
                    _iterator.return();
                  }
                } finally {
                  if (_didIteratorError) {
                    throw _iteratorError;
                  }
                }
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
              var _req$query$sort$split = req.query.sort.split(','),
                  _req$query$sort$split2 = (0, _slicedToArray2.default)(_req$query$sort$split, 2),
                  sortField = _req$query$sort$split2[0],
                  sortDir = _req$query$sort$split2[1];

              options.sort = [[sortField, sortDir || 'asc']];
              delete req.query.sort;
            }

            criteria = req.query;
          }

          if (__single) {
            options.limit = 1;
          } // built-in hooks


          if (cfg.options.use_objectid) {
            try {
              if (criteria._id) {
                if (typeof criteria._id === 'string') {
                  criteria._id = new _mongodb.default.ObjectID(criteria._id);
                } else if (criteria._id.$in) {
                  var ids = criteria._id.$in;
                  criteria._id.$in = Array.from(ids).map(function (id) {
                    return new _mongodb.default.ObjectID(id);
                  });
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
          } // don't allow $where clauses in the criteria


          if (criteria.$where) {
            return res.send(403, 'use of the $where operator is not allowed');
          } // dont make a DB call for blacklist
          // as mongo errors can be revealing


          if (!hasPermission()) {
            if (__single) {
              return res.sendStatus(404);
            }

            return callback([]);
          } // hooks


          hook('before', 'find', [criteria, fields, options]); // run query

          var collection = db.collection(req.params.collection);

          if (Object.keys(fields).length > 0) {
            options.projection = fields;
          }

          return collection.find(criteria, options).toArray(function (findErr, _docs) {
            var docs = _docs;
            var doc;

            if (findErr) {
              return handleError(findErr);
            }

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = docs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                doc = _step2.value;
                hook('after', 'find', doc);
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                  _iterator2.return();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }

            if (__field) {
              var fn = function fn(_o) {
                var o = _o;
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                  for (var _iterator3 = __field.split('.')[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var key = _step3.value;
                    o = o != null ? o[key] : undefined;
                  }
                } catch (err) {
                  _didIteratorError3 = true;
                  _iteratorError3 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
                      _iterator3.return();
                    }
                  } finally {
                    if (_didIteratorError3) {
                      throw _iteratorError3;
                    }
                  }
                }

                return o;
              };

              docs = function () {
                var result = [];
                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                  for (var _iterator4 = docs[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    doc = _step4.value;
                    result.push(fn(doc));
                  }
                } catch (err) {
                  _didIteratorError4 = true;
                  _iteratorError4 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return != null) {
                      _iterator4.return();
                    }
                  } finally {
                    if (_didIteratorError4) {
                      throw _iteratorError4;
                    }
                  }
                }

                return result;
              }();
            }

            if (__single) {
              if (docs.length === 0) {
                return res.sendStatus(404);
              }

              var _docs2 = docs;

              var _docs3 = (0, _slicedToArray2.default)(_docs2, 1);

              docs = _docs3[0];
            }

            return callback(docs);
          });
        });
      }); // db.collection.findOne

      url = "".concat(cfg.root, "/:collection/findOne");
      router.get(url, auth, function (_req, _res, getNext) {
        var req = _req;
        var res = _res;
        req.url = "".concat(cfg.root, "/").concat(req.params.collection, "/find");
        req.query.__single = true;
        return router.handle(req, res, getNext);
      }); // db.collection.findById

      url = "".concat(cfg.root, "/:collection/:id*");
      router.get(url, auth, function (_req, _res, getCallback) {
        var req = _req;
        var res = _res;
        req.url = "".concat(cfg.root, "/").concat(req.params.collection, "/find");
        req.query.criteria = JSON.stringify({
          _id: req.params.id
        });
        req.query.__single = true;

        if (req.params[1]) {
          var _req$params = (0, _slicedToArray2.default)(req.params, 2),
              field = _req$params[1];

          req.query.__field = field;
        }

        return router.handle(req, res, getCallback);
      }); // execute routes

      return router.handle(parentReq, parentRes, next);
    });
  };
};

exports.server = server;
(function() {
  var Firebase, exports, extend, fetch, request,
    slice = [].slice,
    extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  if (typeof window !== 'undefined') {
    exports = window.mongofb = {};
    extend = function(target, object) {
      return $.extend(true, target, object);
    };
    Firebase = window.Firebase;
    fetch = function(args) {
      var async, error, result, success;
      result = null;
      if (args.next) {
        success = function(data) {
          return args.next(null, data);
        };
        error = function(jqXHR, textStatus, err) {
          return args.next(jqXHR, null);
        };
        async = true;
      } else {
        success = function(data) {
          return result = data;
        };
        error = function() {
          return result = null;
        };
        async = false;
      }
      $.ajax({
        url: args.url,
        cache: args.cache,
        type: 'GET',
        data: args.params,
        success: success,
        error: error,
        async: async
      });
      return result;
    };
  } else {
    exports = module.exports = {};
    extend = require('node.extend');
    request = require('request');
    Firebase = require('firebase');
    fetch = function(args) {
      var base;
      if (args.params == null) {
        args.params = {};
      }
      if (!args.cache) {
        if ((base = args.params)._ == null) {
          base._ = Date.now();
        }
      }
      return request({
        url: args.url,
        qs: args.params,
        method: 'GET'
      }, (function(_this) {
        return function(err, resp, body) {
          var error1;
          if (err) {
            return args.next(err);
          }
          if (!resp) {
            return args.next('bad response');
          }
          switch (resp.statusCode) {
            case 200:
              if (args.json) {
                try {
                  body = JSON.parse(body);
                } catch (error1) {
                  err = error1;
                  body = null;
                }
              }
              break;
            case 404:
              body = null;
              break;
            default:
              err = body;
              body = null;
          }
          return args.next(err, body);
        };
      })(this));
    };
  }

  exports.utils = {
    isEquals: function(a, b) {
      var k;
      if (a && !b) {
        return false;
      }
      if (b && !a) {
        return false;
      }
      if (typeof a !== typeof b) {
        return false;
      }
      if (a === null && b === null) {
        return true;
      }
      switch (typeof a) {
        case 'function':
          if (a.toString() !== b.toString()) {
            return false;
          }
          break;
        case 'object':
          if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
          }
          for (k in a) {
            if (!exports.utils.isEquals(a[k], b[k])) {
              return false;
            }
          }
          break;
        default:
          if (a !== b) {
            return false;
          }
      }
      return true;
    },
    log: function(msg) {
      return console.log("[monogfb] " + msg);
    },
    prepareFind: function(the_arguments) {
      var args, criteria, fields, has_callback, jsonify, next, options, params, query, ref1, ref2, ref3, special;
      args = Array.prototype.slice.call(the_arguments, 0);
      jsonify = function(q) {
        var k, o, v;
        o = {};
        for (k in q) {
          v = q[k];
          if (v) {
            o[k] = JSON.stringify(v);
          }
        }
        return o;
      };
      has_callback = typeof args[args.length - 1] === 'function';
      if (has_callback) {
        next = args[args.length - 1];
      }
      criteria = {};
      if (typeof args[0] === 'object') {
        criteria = args[0];
      }
      if (typeof args[1] === 'object') {
        fields = args[1];
      }
      if (typeof args[2] === 'object') {
        options = args[2];
      }
      if (typeof args[3] === 'object') {
        special = args[3];
      }
      if (options && !special && (options.token || options._)) {
        ref1 = [options, null], special = ref1[0], options = ref1[1];
      }
      if (fields && !options && (fields.limit || fields.skip || fields.sort)) {
        ref2 = [fields, null], options = ref2[0], fields = ref2[1];
      }
      if (fields && !special && (fields.token || fields._)) {
        ref3 = [fields, null], special = ref3[0], fields = ref3[1];
      }
      query = {
        criteria: criteria,
        fields: fields,
        options: options
      };
      params = jsonify(query);
      if (special != null ? special.token : void 0) {
        params.token = special.token;
      }
      if (special != null ? special._ : void 0) {
        params._ = special._;
      }
      return [query, params, next];
    },
    startsWith: function(str, target) {
      return str.slice(0, target.length) === target;
    }
  };

  exports.EventEmitter = (function() {
    function EventEmitter() {
      this.events = {};
    }

    EventEmitter.prototype.emit = function() {
      var args, event, handler, i, len, ref1, results;
      event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      if (this.events[event]) {
        ref1 = this.events[event];
        results = [];
        for (i = 0, len = ref1.length; i < len; i++) {
          handler = ref1[i];
          results.push(handler.apply(null, args));
        }
        return results;
      }
    };

    EventEmitter.prototype.on = function(event, handler) {
      var base;
      if ((base = this.events)[event] == null) {
        base[event] = [];
      }
      return this.events[event].push(handler);
    };

    EventEmitter.prototype.off = function(event, handler) {
      var base;
      if (handler == null) {
        handler = null;
      }
      if ((base = this.events)[event] == null) {
        base[event] = [];
      }
      return this.events[event] = this.events[event].filter(function(fn) {
        return handler !== null && fn !== handler;
      });
    };

    return EventEmitter;

  })();

  exports.Database = (function() {
    function Database(cfg) {
      this.cache = true;
      this.safe_writes = true;
      if (typeof cfg === 'string') {
        this.api = cfg;
        this.request('Firebase', false, function(url) {
          this.firebase = new Firebase(url);
          return this.sync_base = 'sync';
        });
      } else if (cfg.shard) {
        this.api = cfg.server;
        this.firebase = new Firebase("https://" + cfg.shard + ".firebaseio.com");
        this.sync_base = "shards/sync/" + cfg.shard;
      } else {
        this.api = cfg.server;
        this.firebase = new Firebase(cfg.firebase);
        this.sync_base = 'sync';
      }
    }

    Database.prototype.collection = function(name) {
      return new exports.Collection(this, name);
    };

    Database.prototype.get = function(path) {
      var collection;
      path = path.split(/[\/\.]/g);
      collection = this.collection(path[0]);
      if (path.length === 1) {
        return collection;
      }
      return collection.get(path.slice(1).join('/'));
    };

    Database.prototype.request = function() {
      var arg, i, json, len, next, params, resource, url;
      json = true;
      resource = '';
      next = null;
      params = {};
      for (i = 0, len = arguments.length; i < len; i++) {
        arg = arguments[i];
        switch (typeof arg) {
          case 'boolean':
            json = arg;
            break;
          case 'string':
            resource = arg;
            break;
          case 'function':
            next = arg;
            break;
          case 'object':
            params = arg;
        }
      }
      url = this.api + "/" + resource;
      if (this.token) {
        params.token = this.token;
      }
      return fetch({
        cache: this.cache,
        json: json,
        next: next,
        params: params,
        resource: resource,
        url: url
      });
    };

    Database.prototype.auth = function(token, next) {
      return this.firebase.authWithCustomToken(token, (function(_this) {
        return function(err) {
          if (err) {
            return typeof next === "function" ? next(err) : void 0;
          }
          _this.token = token;
          return typeof next === "function" ? next() : void 0;
        };
      })(this));
    };

    Database.prototype.setToken = function(token) {
      return this.token = token;
    };

    return Database;

  })();

  exports.Collection = (function() {
    function Collection(database, name1) {
      this.database = database;
      this.name = name1;
      this.sync_base = this.database.sync_base;
      this.ref = new exports.CollectionRef(this);
    }

    Collection.prototype.get = function(path) {
      var doc;
      path = path.split(/[\/\.]/g);
      doc = collection.findById(path[0]);
      if (path.length === 1) {
        return doc;
      }
      return doc.get(path.slice(1).join('/'));
    };

    Collection.prototype.insert = function(doc, priority, next) {
      var ref1;
      if (typeof priority === 'function') {
        ref1 = [priority, null], next = ref1[0], priority = ref1[1];
      }
      return this.database.request('ObjectID', false, {
        _: (Date.now()) + "-" + (Math.random())
      }, (function(_this) {
        return function(err, id) {
          var ref;
          if (err) {
            return typeof next === "function" ? next(err) : void 0;
          }
          doc._id = id;
          ref = _this.database.firebase.child(_this.name + "/" + id);
          return ref.set(doc, function(err) {
            if (err) {
              return typeof next === "function" ? next(err) : void 0;
            }
            if (priority) {
              ref.setPriority(priority);
            }
            return _this.database.request(_this.sync_base + "/" + _this.name + "/" + id, {
              _: Date.now()
            }, function(err, data) {
              if (err) {
                return typeof next === "function" ? next(err) : void 0;
              }
              return typeof next === "function" ? next(null, new exports.Document(_this, data)) : void 0;
            });
          });
        };
      })(this));
    };

    Collection.prototype.find = function(criteria, fields, options, next) {
      var data, datas, params, query, ref1;
      if (criteria == null) {
        criteria = null;
      }
      if (fields == null) {
        fields = null;
      }
      if (options == null) {
        options = null;
      }
      if (next == null) {
        next = null;
      }
      ref1 = exports.utils.prepareFind(arguments), query = ref1[0], params = ref1[1], next = ref1[2];
      if (next) {
        return this.database.request(this.name + "/find", params, (function(_this) {
          return function(err, datas) {
            var data;
            if (err) {
              return next(err);
            }
            return next(null, (function() {
              var i, len, results;
              results = [];
              for (i = 0, len = datas.length; i < len; i++) {
                data = datas[i];
                results.push(new exports.Document(this, data, query));
              }
              return results;
            }).call(_this));
          };
        })(this));
      } else {
        datas = this.database.request(this.name + "/find", params) || [];
        return (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = datas.length; i < len; i++) {
            data = datas[i];
            results.push(new exports.Document(this, data, query));
          }
          return results;
        }).call(this);
      }
    };

    Collection.prototype.findById = function(id, fields, options, next) {
      var data, params, query, ref1;
      if (id == null) {
        id = null;
      }
      if (fields == null) {
        fields = null;
      }
      if (options == null) {
        options = null;
      }
      if (next == null) {
        next = null;
      }
      ref1 = exports.utils.prepareFind(arguments), query = ref1[0], params = ref1[1], next = ref1[2];
      if (next) {
        return this.database.request(this.name + "/" + id, params, (function(_this) {
          return function(err, data) {
            if (err) {
              return next(err);
            }
            if (!data) {
              return next(null, null);
            }
            return next(null, new exports.Document(_this, data));
          };
        })(this));
      } else {
        data = this.database.request(this.name + "/" + id, params);
        if (!data) {
          return null;
        }
        return new exports.Document(this, data);
      }
    };

    Collection.prototype.findOne = function(criteria, fields, options, next) {
      var data, params, query, ref1;
      if (criteria == null) {
        criteria = null;
      }
      if (fields == null) {
        fields = null;
      }
      if (options == null) {
        options = null;
      }
      if (next == null) {
        next = null;
      }
      ref1 = exports.utils.prepareFind(arguments), query = ref1[0], params = ref1[1], next = ref1[2];
      if (next) {
        return this.database.request(this.name + "/findOne", params, (function(_this) {
          return function(err, data) {
            if (err) {
              return next(err);
            }
            if (!data) {
              return next(null, null);
            }
            return next(null, new exports.Document(_this, data, query));
          };
        })(this));
      } else {
        data = this.database.request(this.name + "/findOne", params);
        if (!data) {
          return null;
        }
        return new exports.Document(this, data, query);
      }
    };

    Collection.prototype.list = function(priority, limit) {
      if (limit == null) {
        limit = 1;
      }
      this.ref.endAt(priority);
      this.ref.limit(limit);
      return this.ref;
    };

    Collection.prototype.removeById = function(_id, next) {
      var ref;
      ref = this.database.firebase.child(this.name + "/" + _id);
      return ref.once('value', (function(_this) {
        return function(snapshot) {
          var old_data;
          old_data = snapshot.val();
          return ref.set(null, function(err) {
            if (err) {
              return typeof next === "function" ? next(err) : void 0;
            }
            return _this.database.request(_this.sync_base + "/" + _this.name + "/" + _id, function(err, data) {
              if (err) {
                return ref.set(old_data, function(err) {
                  if (err) {
                    return typeof next === "function" ? next('sync failed, and rollback failed') : void 0;
                  } else {
                    return typeof next === "function" ? next('sync failed, data rollback successful') : void 0;
                  }
                });
              } else {
                return typeof next === "function" ? next(null) : void 0;
              }
            });
          });
        };
      })(this));
    };

    return Collection;

  })();

  exports.PseudoCollection = (function(superClass) {
    extend1(PseudoCollection, superClass);

    function PseudoCollection(database, name1, defaults) {
      this.database = database;
      this.name = name1;
      this.defaults = defaults != null ? defaults : {};
      PseudoCollection.__super__.constructor.call(this, this.database, this.name);
    }

    PseudoCollection.prototype.insert = function(doc, priority, next) {
      var k, ref1, v;
      ref1 = this.defaults;
      for (k in ref1) {
        v = ref1[k];
        doc[k] = v;
      }
      return PseudoCollection.__super__.insert.call(this, doc, priority, next);
    };

    PseudoCollection.prototype.find = function(criteria, fields, options, next) {
      var k, params, query, ref1, ref2, v;
      if (criteria == null) {
        criteria = null;
      }
      if (fields == null) {
        fields = null;
      }
      if (options == null) {
        options = null;
      }
      if (next == null) {
        next = null;
      }
      ref1 = exports.utils.prepareFind(arguments), query = ref1[0], params = ref1[1], next = ref1[2];
      ref2 = this.defaults;
      for (k in ref2) {
        v = ref2[k];
        query.criteria[k] = v;
      }
      return PseudoCollection.__super__.find.call(this, query.criteria, query.fields, query.options, next);
    };

    PseudoCollection.prototype.findOne = function(criteria, fields, options, next) {
      var k, params, query, ref1, ref2, v;
      if (criteria == null) {
        criteria = null;
      }
      if (fields == null) {
        fields = null;
      }
      if (options == null) {
        options = null;
      }
      if (next == null) {
        next = null;
      }
      ref1 = exports.utils.prepareFind(arguments), query = ref1[0], params = ref1[1], next = ref1[2];
      ref2 = this.defaults;
      for (k in ref2) {
        v = ref2[k];
        query.criteria[k] = v;
      }
      return PseudoCollection.__super__.findOne.call(this, query.criteria, query.fields, query.options, next);
    };

    return PseudoCollection;

  })(exports.Collection);

  exports.CollectionRef = (function(superClass) {
    extend1(CollectionRef, superClass);

    function CollectionRef(collection1) {
      this.collection = collection1;
      this.database = this.collection.database;
      this.ref = this.database.firebase.child(this.collection.name);
    }

    CollectionRef.prototype.endAt = function(priority) {
      return this.ref = this.ref.endAt(priority);
    };

    CollectionRef.prototype.limit = function(num) {
      return this.ref = this.ref.limit(num);
    };

    CollectionRef.prototype.startAt = function(priority) {
      return this.ref = this.ref.startAt(priority);
    };

    CollectionRef.prototype.on = function(event, handler) {
      var ref1, ref2;
      CollectionRef.__super__.on.call(this, event, handler);
      if (((ref1 = this.events.insert) != null ? ref1.length : void 0) > 0) {
        this.ref.off('child_added');
        this.ref.on('child_added', (function(_this) {
          return function(snapshot) {
            return _this.emit('insert', snapshot.val());
          };
        })(this));
      }
      if (((ref2 = this.events.remove) != null ? ref2.length : void 0) > 0) {
        this.ref.off('child_removed');
        return this.ref.on('child_removed', (function(_this) {
          return function(snapshot) {
            return _this.emit('remove', snapshot.val());
          };
        })(this));
      }
    };

    CollectionRef.prototype.off = function(event, handler) {
      var ref1, ref2;
      if (handler == null) {
        handler = null;
      }
      CollectionRef.__super__.off.call(this, event, handler);
      if (((ref1 = this.events.insert) != null ? ref1.length : void 0) === 0) {
        this.ref.off('child_added');
      }
      if (((ref2 = this.events.remove) != null ? ref2.length : void 0) === 0) {
        return this.ref.off('child_removed');
      }
    };

    return CollectionRef;

  })(exports.EventEmitter);

  exports.Document = (function() {
    function Document(collection1, data1, query1) {
      this.collection = collection1;
      this.data = data1;
      this.query = query1;
      this.database = this.collection.database;
      this.key = this.collection.name + "/" + this.data._id;
      if (this.query == null) {
        this.query = {
          criteria: null,
          fields: null,
          options: null
        };
      }
      this.ref = new exports.DocumentRef(this);
    }

    Document.prototype.emit = function() {
      var args, event, ref1;
      event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return (ref1 = this.ref).emit.apply(ref1, [event].concat(slice.call(args)));
    };

    Document.prototype.get = function(path) {
      return this.ref.get(path);
    };

    Document.prototype.name = function() {
      return this.ref.name();
    };

    Document.prototype.on = function(event, handler) {
      return this.ref.on(event, handler);
    };

    Document.prototype.off = function(event, handler) {
      return this.ref.off(event, handler);
    };

    Document.prototype.refresh = function(next) {
      return this.ref.refresh(next);
    };

    Document.prototype.remove = function(next) {
      var ref1;
      if ((ref1 = typeof next) !== 'function' && ref1 !== 'undefined') {
        return exports.utils.log('invalid callback function to remove');
      }
      return this.collection.removeById(this.data._id, next);
    };

    Document.prototype.save = function(next) {
      return this.ref.set(this.data, next);
    };

    Document.prototype.set = function(value, next) {
      if (next == null) {
        next = null;
      }
      return this.ref.set(value, next);
    };

    Document.prototype.val = function() {
      return this.ref.val();
    };

    return Document;

  })();

  exports.DocumentRef = (function(superClass) {
    extend1(DocumentRef, superClass);

    DocumentRef._counter = 0;

    function DocumentRef(document, path1) {
      var i, k, len, ref1, ref2;
      this.document = document;
      this.path = path1 != null ? path1 : '';
      DocumentRef.__super__.constructor.call(this);
      this.counter = ++exports.DocumentRef._counter;
      this.collection = this.document.collection;
      this.database = this.collection.database;
      this.sync_base = this.database.sync_base;
      if (typeof this.path === 'string') {
        if (this.path.slice(0, 1) === '/') {
          this.path = this.path.slice(1);
        }
        if (typeof this.path === 'string') {
          this.path = this.path.split(/[\/\.]/g);
        }
      }
      this.key = (this.document.key + "/" + (this.path.join('/'))).replace(/\/$/, '');
      this.data = this.document.data;
      ref1 = this.path;
      for (i = 0, len = ref1.length; i < len; i++) {
        k = ref1[i];
        if (k !== '') {
          this.data = (ref2 = this.data) != null ? ref2[k] : void 0;
        }
      }
      if (this.data == null) {
        this.data = null;
      }
      this.ref = this.database.firebase.child(this.key);
    }

    DocumentRef.prototype.log = function() {
      return console.log.apply(console, ["ref_" + this.counter].concat(slice.call(arguments)));
    };

    DocumentRef.prototype.get = function(path) {
      var temp;
      temp = this.path.slice(0);
      while (exports.utils.startsWith(path, '..')) {
        temp.pop();
        path = path.slice(2);
        if (exports.utils.startsWith(path, '/')) {
          path = path.slice(1);
        }
      }
      return new exports.DocumentRef(this.document, (temp.join('/')) + "/" + path);
    };

    DocumentRef.prototype.name = function() {
      if (this.path.length === 1 && this.path[0] === '') {
        return this.data._id;
      } else {
        return this.path[this.path.length - 1];
      }
    };

    DocumentRef.prototype.on = function(event, handler) {
      var ref1, ref2;
      DocumentRef.__super__.on.call(this, event, handler);
      if (((ref1 = this.events.update) != null ? ref1.length : void 0) > 0 || ((ref2 = this.events.value) != null ? ref2.length : void 0) > 0) {
        return this.ref.on('value', (function(_this) {
          return function(snapshot) {
            return _this.updateData(snapshot.val(), function() {
              return _this.emit('value', _this.val());
            });
          };
        })(this));
      }
    };

    DocumentRef.prototype.off = function(event, handler) {
      var ref1, ref2;
      if (handler == null) {
        handler = null;
      }
      DocumentRef.__super__.off.call(this, event, handler);
      if (!(((ref1 = this.events.update) != null ? ref1.length : void 0) && ((ref2 = this.events.value) != null ? ref2.length : void 0))) {
        return this.ref.off('value');
      }
    };

    DocumentRef.prototype.parent = function() {
      return new exports.DocumentRef(this.document, this.path.slice(0, this.path.length - 1));
    };

    DocumentRef.prototype.refresh = function(next) {
      return this.ref.once('value', (function(_this) {
        return function(snapshot) {
          return _this.updateData(snapshot.val(), function() {
            return typeof next === "function" ? next() : void 0;
          });
        };
      })(this));
    };

    DocumentRef.prototype.remove = function(next) {
      var ref1;
      if ((ref1 = typeof next) !== 'function' && ref1 !== 'undefined') {
        return exports.utils.log('invalid callback function to remove');
      }
      return this.set(null, next);
    };

    DocumentRef.prototype.set = function(value, next) {
      var allow, dst, k, ref, ref1, v;
      if (this.database.safe_writes) {
        allow = true;
        if (this.document.query.fields) {
          allow = false;
          ref1 = this.document.query.fields;
          for (k in ref1) {
            v = ref1[k];
            dst = this.document.key + "/" + (k.replace(/\./g, '/'));
            allow = allow || this.key.indexOf(dst) === 0;
          }
        }
        if (!allow) {
          return typeof next === "function" ? next('cannot set a field that was not queried for') : void 0;
        }
      }
      ref = this.database.firebase.child(this.key);
      return ref.set(value, (function(_this) {
        return function(err) {
          if (err) {
            return typeof next === "function" ? next(err) : void 0;
          }
          return _this.database.request(_this.sync_base + "/" + _this.key, function(err, data) {
            if (err) {
              return typeof next === "function" ? next(err) : void 0;
            }
            return _this.updateData(value, function() {
              return typeof next === "function" ? next(null) : void 0;
            });
          });
        };
      })(this));
    };

    DocumentRef.prototype.updateData = function(data, next) {
      var ref1, ref2;
      if (this.key === this.document.key) {
        if ((ref1 = this.data) != null ? ref1.created : void 0) {
          data.created = this.data.created;
        }
        if ((ref2 = this.data) != null ? ref2.last_modified : void 0) {
          data.last_modified = this.data.last_modified;
        }
      }
      if (exports.utils.isEquals(this.data, data)) {
        return typeof next === "function" ? next() : void 0;
      }
      return setTimeout(((function(_this) {
        return function() {
          var i, j, k, key, keys, len, ref3, target;
          _this.data = data;
          if (_this.path.length === 1 && _this.path[0] === '') {
            _this.document.data = data;
          } else {
            ref3 = _this.path, keys = 2 <= ref3.length ? slice.call(ref3, 0, i = ref3.length - 1) : (i = 0, []), key = ref3[i++];
            target = _this.document.data;
            for (j = 0, len = keys.length; j < len; j++) {
              k = keys[j];
              if (target[k] == null) {
                target[k] = {};
              }
              target = target[k];
            }
            target[key] = data;
          }
          _this.emit('update', _this.val());
          _this.emit('value', _this.val());
          return typeof next === "function" ? next() : void 0;
        };
      })(this)), 1);
    };

    DocumentRef.prototype.val = function() {
      if (this.data === null) {
        return null;
      }
      if (Array.isArray(this.data)) {
        return extend([], this.data);
      } else if (typeof this.data === 'object') {
        return extend({}, this.data);
      } else {
        return this.data;
      }
    };

    return DocumentRef;

  })(exports.EventEmitter);

}).call(this);

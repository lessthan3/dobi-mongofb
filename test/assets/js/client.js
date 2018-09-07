/*
 * decaffeinate suggestions:
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// Mongo Firebase
// mongofb.js
//
// Database
// Collection
// CollectionRef
// Document
// DocumentRef
//

// from https://github.com/iliakan/detect-node
(() => {
  let extend;
  let fetch;
  let Firebase;
  let request;
  let Collection;
  let DocumentRef;
  let Document;
  let CollectionRef;
  const isNode = () => {
    const processObj = typeof process !== 'undefined' ? process : 0;
    const expectedProcessType = '[object process]';
    const envProcessType = Object.prototype.toString.call(processObj);
    return envProcessType === expectedProcessType;
  };

  const utils = {
    isEquals(a, b) {
      if (a && !b) {
        return false;
      }
      if (b && !a) {
        return false;
      }
      if (typeof (
        a
      ) !== typeof (
        b
      )) {
        return false;
      }
      if ((
        a === null
      ) && (
        b === null
      )) {
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
          for (const k in a) {
            if (!utils.isEquals(a[k], b[k])) {
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

    // logging utility
    log(msg) {
      // eslint-disable-next-line no-console
      return console.log(`[monogfb] ${msg}`);
    },

    // prepare query parameters for a find
    prepareFind(..._args) {
      let fields;
      let next;
      let options;
      let special;

      const args = _args.filter(arg => arg != null);
      console.log(args);

      // stringify json params
      const jsonify = (q) => {
        const o = {};
        for (const k of Object.keys(q)) {
          const v = q[k];
          if (v) {
            o[k] = JSON.stringify(v);
          }
        }
        return o;
      };

      // callback
      const hasCallback = typeof args[args.length - 1] === 'function';
      if (hasCallback) {
        next = args[args.length - 1];
      }

      // defaults
      let criteria = {};

      // query objects
      if (typeof args[0] === 'object') {
        [criteria] = args;
      }
      if (typeof args[1] === 'object') {
        [, fields] = args;
      }
      if (typeof args[2] === 'object') {
        [, , options] = args;
      }
      if (typeof args[3] === 'object') {
        [, , , special] = args;
      }

      // args[1] can be either fields or options or special
      // args[2] can be either options or special

      // case: special was in args[2]
      if (options && !special && (
        options.token || options._
      )) {
        [special, options] = [options, null];
      }

      // case: options was in args[1]
      if (fields && !options && (
        fields.limit || fields.skip || fields.sort
      )) {
        [options, fields] = [fields, null];
      }

      // case: special was in args[1]
      if (fields && !special && (
        fields.token || fields._
      )) {
        [special, fields] = [fields, null];
      }

      // format query objects and prepare to send
      const query = { criteria, fields, options };
      const params = jsonify(query);

      if (special != null ? special.token : undefined) {
        params.token = special.token;
      }
      if (special != null ? special._ : undefined) {
        params._ = special._;
      }

      return [query, params, next];
    },

    startsWith(str, target) {
      return str.slice(0, target.length) === target;
    },
  };

  class EventEmitter {
    constructor() {
      this.events = {};
    }

    emit(event, ...args) {
      if (this.events[event]) {
        for (const handler of this.events[event]) {
          handler(...args || []);
        }
      }
    }

    on(event, handler) {
      if (this.events[event] == null) {
        this.events[event] = [];
      }
      this.events[event].push(handler);
    }

    // handler=null will remove all events of that type
    off(event, handler = null) {
      if (this.events[event] == null) {
        this.events[event] = [];
      }
      this.events[event] = this.events[event].filter(fn => (
        handler !== null
      ) && (
        fn !== handler
      ));
    }
  }

  class Database {
    constructor(cfg) {
      this.cache = true;
      this.safe_writes = true;
      if (typeof cfg === 'string') {
        this.api = cfg;
        this.request('Firebase', false, (url) => {
          this.firebase = new Firebase(url);
        });
      } else {
        this.api = cfg.server;
        this.firebase = new Firebase(cfg.firebase);
      }
    }

    collection(name) {
      return new Collection(this, name);
    }

    get(_path) {
      const path = _path.split(/[/.]/g);
      const collection = this.collection(path[0]);
      if (path.length === 1) {
        return collection;
      }
      return collection.get(path.slice(1).join('/'));
    }

    request(...args) {
      let json = true;
      let resource = '';
      let next = null;
      let params = {};

      for (const arg of args) {
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
            break;
          default:
            break;
        }
      }

      const url = `${this.api}/${resource}`;
      if (this.token) {
        params.token = this.token;
      }
      return fetch({
        cache: this.cache,
        json,
        next,
        params,
        resource,
        url,
      });
    }

    auth(token, next) {
      return this.firebase.authWithCustomToken(token, () => {
        this.token = token;
        return next();
      });
    }

    setToken(token) {
      this.token = token;
    }
  }

  // eslint-disable-next-line no-shadow
  Collection = class Collection {
    constructor(database, name) {
      this.database = database;
      this.name = name;
      this.ref = new CollectionRef(this);
    }

    insert(_doc, _priority, _next) {
      const doc = _doc;
      let next = _next;
      let priority = _priority;
      if (typeof priority === 'function') {
        [next, priority] = [priority, null];
      }
      if (typeof next !== 'function') {
        next = () => {
        };
      }
      return this.database.request('ObjectID', false, {
        _: `${Date.now()}-${Math.random()}`,
      }, (requestErr, id) => {
        if (requestErr) {
          return next(requestErr);
        }
        doc._id = id;
        const ref = this.database.firebase.child(`${this.name}/${id}`);
        return ref.set(doc, (setErr) => {
          if (setErr) {
            return next(setErr);
          }
          if (priority) {
            ref.setPriority(priority);
          }
          return this.database.request(`sync/${this.name}/${id}`, {
            _: Date.now(),
          }, (err, data) => {
            if (err) {
              return next(err);
            }
            return next(null, new Document(this, data));
          });
        });
      });
    }

    // find()
    // find(criteria)
    // find(criteria, fields)
    // find(criteria, options)
    // find(criteria, fields, options)
    //
    // find(next)
    // find(criteria, next)
    // find(criteria, fields, next)
    // find(criteria, options, next)
    // find(criteria, fields, options, next)
    find(criteria = null, fields = null, options = null, _next = null) {
      const [query, params, next] = utils.prepareFind(criteria, fields, options, _next);

      if (next) {
        return this.database.request(`${this.name}/find`, params, (err, datas) => {
          if (err) {
            return next(err);
          }
          const output = [];
          for (const data of datas) {
            output.push(new Document(this, data, query));
          }
          return next(null, output);
        });
      }
      const datas = this.database.request(`${this.name}/find`, params) || [];
      const result = [];
      for (const data of datas) {
        result.push(new Document(this, data, query));
      }
      return result;
    }

    findById(id = null, fields = null, options = null, _next = null) {
      const [, params, next] = utils.prepareFind(id, fields, options, _next);

      if (next) {
        return this.database.request(`${this.name}/${id}`, params, (err, data) => {
          if (err) {
            return next(err);
          }
          if (!data) {
            return next(null, null);
          }
          return next(null, new Document(this, data));
        });
      }
      const data = this.database.request(`${this.name}/${id}`, params);
      if (!data) {
        return null;
      }
      return new Document(this, data);
    }

    // findOne()
    // findOne(criteria)
    // findOne(criteria, fields)
    // findOne(criteria, fields, options)
    //
    // findOne(next)
    // findOne(criteria, next)
    // findOne(criteria, fields, next)
    // findOne(criteria, fields, options, next)
    findOne(criteria = null, fields = null, options = null, _next = null) {
      const [query, params, next] = utils.prepareFind(criteria, fields, options, _next);

      if (next) {
        return this.database.request(`${this.name}/findOne`, params, (err, data) => {
          if (err) {
            return next(err);
          }
          if (!data) {
            return next(null, null);
          }
          return next(null, new Document(this, data, query));
        });
      }
      const data = this.database.request(`${this.name}/findOne`, params);
      if (!data) {
        return null;
      }
      return new Document(this, data, query);
    }

    list(priority, _limit) {
      const limit = _limit == null ? 1 : _limit;
      this.ref.endAt(priority);
      this.ref.limit(limit);
      return this.ref;
    }

    removeById(_id, _next) {
      let next = _next;
      if (typeof next !== 'function') {
        next = () => {
        };
      }
      const ref = this.database.firebase.child(`${this.name}/${_id}`);

      // store current value
      return ref.once('value', (snapshot) => {
        const oldData = snapshot.val();

        // remove value from firebase
        return ref.set(null, (refSetErr) => {
          if (refSetErr) {
            return next(refSetErr);
          }

          // sync result to mongodb
          return this.database.request(`sync/${this.name}/${_id}`, (syncErr) => {
            // if sync failed, rollback data
            if (syncErr) {
              return ref.set(oldData, (err) => {
                if (err) {
                  return next('sync failed, and rollback failed');
                }
                return next('sync failed, data rollback successful');
              });

              // sync successful
            }
            return (
              typeof next === 'function' ? next(null) : undefined
            );
          });
        });
      });
    }
  };

  class PseudoCollection extends Collection {
    constructor(database, name, defaults) {
      super(database, name);
      this.database = database;
      this.name = name;
      this.defaults = defaults == null ? {} : defaults;
    }

    insert(_doc, priority, next) {
      const doc = _doc;
      for (const k of Object.keys(this.defaults)) {
        const v = this.defaults[k];
        doc[k] = v;
      }
      return super.insert(doc, priority, next);
    }

    find(criteria = null, fields = null, options = null, _next = null) {
      const [query, , next] = utils.prepareFind(criteria, fields, options, _next);
      for (const k of Object.keys(this.defaults)) {
        const v = this.defaults[k];
        query.criteria[k] = v;
      }
      return super.find(query.criteria, query.fields, query.options, next);
    }

    findOne(criteria = null, fields = null, options = null, _next = null) {
      const [query, , next] = utils.prepareFind(criteria, fields, options, _next);
      for (const k of Object.keys(this.defaults)) {
        const v = this.defaults[k];
        query.criteria[k] = v;
      }
      return super.findOne(query.criteria, query.fields, query.options, next);
    }
  }

  // eslint-disable-next-line no-shadow
  CollectionRef = class CollectionRef extends EventEmitter {
    constructor(collection) {
      super();
      this.collection = collection;
      this.database = this.collection.database;
      this.ref = this.database.firebase.child(this.collection.name);
    }

    endAt(priority) {
      this.ref = this.ref.endAt(priority);
    }

    limit(num) {
      this.ref = this.ref.limit(num);
    }

    startAt(priority) {
      this.ref = this.ref.startAt(priority);
    }

    on(event, handler) {
      super.on(event, handler);

      if ((
        this.events.insert != null ? this.events.insert.length : undefined
      ) > 0) {
        this.ref.off('child_added');
        this.ref.on('child_added', snapshot => this.emit('insert', snapshot.val()));
      }

      if ((
        this.events.remove != null ? this.events.remove.length : undefined
      ) > 0) {
        this.ref.off('child_removed');
        this.ref.on('child_removed', snapshot => this.emit('remove', snapshot.val()));
      }
    }

    off(event, handler = null) {
      super.off(event, handler);

      if ((
        this.events.insert != null ? this.events.insert.length : undefined
      ) === 0) {
        this.ref.off('child_added');
      }

      if ((
        this.events.remove != null ? this.events.remove.length : undefined
      ) === 0) {
        this.ref.off('child_removed');
      }
    }
  };

  // eslint-disable-next-line no-shadow
  Document = class Document {
    constructor(collection, data, query) {
      this.collection = collection;
      this.data = data;
      this.query = query;
      this.database = this.collection.database;
      this.key = `${this.collection.name}/${this.data._id}`;
      if (this.query == null) {
        this.query = { criteria: null, fields: null, options: null };
      }
      this.ref = new DocumentRef(this);
    }

    emit(event, ...args) {
      return this.ref.emit(event, args);
    }

    get(path) {
      return this.ref.get(path);
    }

    name() {
      return this.ref.name();
    }

    on(event, handler) {
      return this.ref.on(event, handler);
    }

    off(event, handler) {
      return this.ref.off(event, handler);
    }

    refresh(next) {
      return this.ref.refresh(next);
    }

    remove(next) {
      if (!['function', 'undefined'].includes(typeof next)) {
        return utils.log('invalid callback function to remove');
      }
      return this.collection.removeById(this.data._id, next);
    }

    save(next) {
      return this.ref.set(this.data, next);
    }

    set(value, next = null) {
      return this.ref.set(value, next);
    }

    val() {
      return this.ref.val();
    }
  };

  // eslint-disable-next-line no-shadow
  DocumentRef = class DocumentRef extends EventEmitter {
    constructor(document, path) {
      super();
      this.document = document;
      this.path = path == null ? '' : path;
      this.counter = ++DocumentRef._counter;
      this.collection = this.document.collection;
      this.database = this.collection.database;

      // @path[0] doesn't work in ie6, must use @path[0..0]
      if (typeof this.path === 'string') {
        if (this.path.slice(0, 1) === '/') {
          this.path = this.path.slice(1);
        }
        if (typeof this.path === 'string') {
          this.path = this.path.split(/[/.]/g);
        }
      }
      this.key = `${this.document.key}/${this.path.join('/')}`.replace(/\/$/, '');
      this.data = this.document.data;
      for (const k of this.path) {
        if (k !== '') {
          this.data = this.data != null ? this.data[k] : undefined;
        }
      }
      if (this.data == null) {
        this.data = null;
      }
      this.ref = this.database.firebase.child(this.key);
    }

    log(...args) {
      // eslint-disable-next-line no-console
      return console.log(`ref_${this.counter}`, args);
    }

    get(_path) {
      let path = _path;
      const temp = this.path.slice(0);
      while (utils.startsWith(path, '..')) {
        temp.pop();
        path = path.slice(2);
        if (utils.startsWith(path, '/')) {
          path = path.slice(1);
        }
      }
      return new DocumentRef(this.document, `${temp.join('/')}/${path}`);
    }

    name() {
      if ((
        this.path.length === 1
      ) && (
        this.path[0] === ''
      )) {
        return this.data._id;
      }
      return this.path[this.path.length - 1];
    }

    // value: emit now and when updated
    // update: emit only when updated
    on(event, handler) {
      super.on(event, handler);

      if (
        (
          (
            this.events.update != null ? this.events.update.length : undefined
          ) > 0
        )
        || (
          (
            this.events.value != null ? this.events.value.length : undefined
          ) > 0
        )
      ) {
        this.emit('value', this.val());
        this.ref.on('value', snapshot => this.updateData(snapshot.val()));
      }
    }

    off(event, handler = null) {
      super.off(event, handler);

      if (
        !(
          this.events.update != null ? this.events.update.length : undefined
        )
        || !(
          this.events.value != null ? this.events.value.length : undefined
        )
      ) {
        this.ref.off('value');
      }
    }

    parent() {
      return new DocumentRef(this.document, this.path.slice(0, this.path.length - 1));
    }

    refresh(next) {
      let completed = false;
      const done = () => {
        if (!completed) {
          if (typeof next === 'function') {
            next();
          }
        }
        completed = true;
      };
      return this.ref.once('value', snapshot => this.updateData(snapshot.val(), () => done()));
    }

    remove(next) {
      if (!['function', 'undefined'].includes(typeof next)) {
        return utils.log('invalid callback function to remove');
      }
      return this.set(null, next);
    }

    set(value, next) {
      // if specific fields were queried for, only allow those to be updated
      if (this.database.safe_writes) {
        let allow = true;
        if (this.document.query.fields) {
          allow = false;
          for (const k in this.document.query.fields) {
            if (k) {
              const dst = `${this.document.key}/${k.replace(/\./g, '/')}`;
              allow = allow || (
                this.key.indexOf(dst) === 0
              );
            }
          }
        }
        if (!allow) {
          return (
            typeof next === 'function' ? next(
              'cannot set a field that was not queried for',
            ) : undefined
          );
        }
      }

      const ref = this.database.firebase.child(this.key);
      return ref.set(value, (err) => {
        if (err) {
          return (
            typeof next === 'function' ? next(err) : undefined
          );
        }
        return this.database.request(`sync/${this.key}`, (syncErr) => {
          if (syncErr) {
            return (
              typeof next === 'function' ? next(syncErr) : undefined
            );
          }
          return this.updateData(value, () => (
            typeof next === 'function' ? next(null) : undefined
          ));
        });
      });
    }

    // @data = what we got from mongodb or what was already updated here
    // data = new data from firebase
    updateData(_data, next) {
      const data = _data;
      // ignore special 'created' and 'last_modified' fields on documents
      if (this.key === this.document.key) {
        if (this.data != null ? this.data.created : undefined) {
          data.created = this.data.created;
        }
        if (this.data != null ? this.data.last_modified : undefined) {
          data.last_modified = this.data.last_modified;
        }
      }

      // no updates to send if data isn't changing
      if (utils.isEquals(this.data, data)) {
        return (
          typeof next === 'function' ? next() : undefined
        );
      }


      // here, we need to set a brief timeout so all firebase listeners can
      // fire before we update any data. if we ran this code synchonously
      // a DocumentRef may update the Document data before the Document
      // listener had a chance to update. In that case, the isEquals call a few
      // lines above would return true, and the listener for the Document would
      // never be fired. With this setTimeout, all listeners have a chance to
      // compare against past data before anything is updated.
      //
      // example
      // ```
      //   cookie = db.cookies.findOne()
      //   type = cookie.get 'type'
      //   cookie.on 'update', (val) ->
      //     console.log 'cookie was updated'
      //   type.on 'update', (val) ->
      //     console.log 'type was updated'
      //   type.set 'new type'
      // ```
      //
      // this works because setTimeout() re-queues the new javascript at the end
      // of the execution queue.
      return setTimeout((
        () => {
          // update DocumentRef data
          this.data = data;

          // update document data. this will allow handlers to use
          // ref.get and have access to new data
          if ((
            this.path.length === 1
          ) && (
            this.path[0] === ''
          )) {
            this.document.data = data;
          } else {
            const adjustedLength = Math.max(this.path.length, 1);
            const keys = this.path.slice(0, adjustedLength - 1);
            const key = this.path[adjustedLength - 1];
            let target = this.document.data;
            for (const k of keys) {
              if (target[k] == null) {
                target[k] = {};
              }
              target = target[k];
            }
            target[key] = data;
          }

          // emit the updates
          this.emit('update', this.val());
          this.emit('value', this.val());
          return (
            typeof next === 'function' ? next() : undefined
          );
        }

      ), 1);
    }

    val() {
      if (this.data === null) {
        return null;
      }
      if (Array.isArray(this.data)) {
        return extend([], this.data);
      }
      if (typeof this.data === 'object') {
        return extend({}, this.data);
      }
      return this.data;
    }
  };

  DocumentRef._counter = 0;

  if (!isNode()) {
    window.mongofb = {
      Collection,
      CollectionRef,
      Database,
      Document,
      DocumentRef,
      EventEmitter,
      PseudoCollection,
      utils,
    };
    extend = (target, object) => $.extend(true, target, object);
    (
      { Firebase } = window
    );
    fetch = (args) => {
      let async;
      let error;
      let success;
      let result = null;
      if (args.next) {
        success = data => args.next(null, data);
        error = jqXHR => args.next(jqXHR, null);
        async = true;
      } else {
        success = (data) => {
          result = data;
        };
        error = () => {
          result = null;
        };
        async = false;
      }
      $.ajax({
        async,
        cache: args.cache,
        data: args.params,
        error,
        success,
        type: 'GET',
        url: args.url,
      });
      return result;
    };
  } else {
    module.exports = {
      Collection,
      CollectionRef,
      Database,
      Document,
      DocumentRef,
      EventEmitter,
      PseudoCollection,
      utils,
    };
    extend = require('node.extend'); // eslint-disable-line global-require
    request = require('request'); // eslint-disable-line global-require
    Firebase = require('firebase'); // eslint-disable-line global-require
    fetch = (_args) => {
      const args = _args;
      if (args.params == null) {
        args.params = {};
      }
      if (!args.cache) {
        if (args.params._ == null) {
          args.params._ = Date.now();
        }
      }
      return request({
        method: 'GET',
        qs: args.params,
        url: args.url,
      }, (_err, resp, _body) => {
        let err = _err;
        let body = _body;
        if (err) {
          return args.next(err);
        }
        if (!resp) {
          return args.next('bad response');
        }

        switch (resp.statusCode) {
          // success
          case 200:
            if (args.json) {
              try {
                body = JSON.parse(body);
              } catch (error) {
                err = error;
                body = null;
              }
            }
            break;

          // not found, return null
          case 404:
            body = null;
            break;

          // unexpected response, send error
          // example: 500 error for duplicate key error
          default:
            err = body;
            body = null;
        }

        return args.next(err, body);
      });
    };
  }
})();

import { promisifyAll } from '@google-cloud/promisify';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/auth';
import Collection from './Collection';
import fetch from './fetch';

class Database {
  /**
   * @param {Object} params
   * @param {string} params.api
   * @param {boolean} params.cache
   * @param {Object} params.firebase
   * @param {string} params.firebase.apiKey
   * @param {string} params.firebase.databaseURL
   * @param {string} params.persistence
   * @param {boolean} params.safeWrites
   */
  constructor({
    api,
    cache = true,
    firebase: {
      apiKey,
      databaseURL,
    },
    persistence,
    safeWrites = true,
  }) {
    if (persistence && !['local', 'session', 'none'].includes(persistence)) {
      console.warn(`invalid persistence value: ${persistence}.`);
      this.persistence = 'local';
    } else if (persistence) {
      this.persistence = persistence;
    }

    this.api = api;
    this.cache = cache;
    this.safeWrites = safeWrites;
    if (Database.fbCache) {
      this.firebase = Database.fbCache;
    } else {
      firebase.initializeApp({
        apiKey,
        databaseURL,
      });
      this.firebase = firebase;
      Database.fbCache = firebase;
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

  /**
   * @param {Object} p
   * @param {boolean} p.json
   * @param {string} p.resource
   * @param {Object} p.params
   * @param {Function} next
   */
  request({
    json = true,
    params: _params = {},
    resource = '',
  }, next) {
    const url = `${this.api}/${resource}`;
    const params = { ..._params };
    if (this.token) {
      params.token = this.token;
    }
    return fetch({
      cache: this.cache,
      json,
      params,
      resource,
      url,
    })
      .then(data => next(null, data))
      .catch(err => next(err));
  }

  setPersistence(next) {
    if (this.persistence) {
      const val = this.firebase.auth.Auth.Persistence[this.persistence.toUpperCase()];
      return this.firebase.auth().setPersistence(val)
        .then(() => next())
        .catch(err => next(err));
    }
    return next();
  }

  auth(token, next) {
    this.setPersistence()
      .then(() => {
        this.firebase.auth().signInWithCustomToken(token)
          .then(() => {
            this.token = token;
            return next();
          });
      })
      .catch(err => next(err));
  }

  setToken(token) {
    this.token = token;
  }
}

Database.fbCache = null;

promisifyAll(Database, {
  exclude: ['collection', 'get', 'setToken'],
  singular: true,
});

export default Database;

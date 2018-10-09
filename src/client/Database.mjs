import promisify from '@google-cloud/promisify';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import Collection from './Collection';
import fetch from './fetch';

const { promisifyAll } = promisify;
const SHARD_REGEX = /^https?:\/\/([\w\d-_]+)\.firebaseio\.com/;

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
    } = {},
    persistence,
    safeWrites = true,
  }) {
    if (persistence && !['local', 'session', 'none'].includes(persistence)) {
      // eslint-disable-next-line no-console
      console.warn(`invalid persistence value: ${persistence}.`);
      this.persistence = 'local';
    } else if (persistence) {
      this.persistence = persistence;
    }

    this.api = api;
    this.apiKey = apiKey;
    this.cache = cache;
    this.currentUser = null;
    this.refreshToken = null;
    // eslint-disable-next-line prefer-destructuring
    this.shard = SHARD_REGEX.exec(databaseURL)[1];
    this.safeWrites = safeWrites;
    const key = `dobi-mongofb-${databaseURL}`;
    if (Database.fbCache[key]) {
      this.firebase = Database.fbCache[key];
    } else {
      this.firebase = firebase.initializeApp({
        apiKey,
        databaseURL,
      }, key);
      Database.fbCache[key] = this.firebase;
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
    params = {},
    resource = '',
  }, next) {
    const url = `${this.api}/${resource}`;

    const getToken = () => new Promise((resolve) => {
      if (!this.currentUser) {
        return resolve();
      }
      return this.getIdToken((err, idToken) => {
        if (err) {
          // eslint-disable-next-line
          console.warn(err);
          return resolve(null);
        }
        return resolve(idToken);
      });
    });

    return getToken()
      .then(idToken => fetch({
        cache: this.cache,
        json,
        params: {
          ...params,
          idToken: idToken || undefined,
          shard: this.shard,
        },
        resource,
        url,
      }))
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

  getRefreshToken() {
    return this.refreshToken;
  }

  getIdToken(next) {
    if (!this.currentUser) {
      return next('must log in first.');
    }
    return this.firebase.auth().currentUser.getIdToken(true)
      .then(token => next(null, token))
      .catch(err => next(err));
  }

  signInWithCustomToken(token, next) {
    this.setPersistence()
      .then(() => (
        this.firebase.auth().signInWithCustomToken(token)
      ))
      .then(() => (
        this.firebase.auth().currentUser.getIdTokenResult(true)
      ))
      .then((idTokenResult) => {
        this.currentUser = idTokenResult;
        this.refreshToken = this.firebase.auth().currentUser.refreshToken;
        return next();
      })
      .catch(err => next(err));
  }

  signOut(next) {
    this.currentUser = null;
    this.refreshToken = null;
    this.firebase.auth().signOut()
      .then(() => next())
      .catch(err => next(err));
  }
}

Database.fbCache = {};

promisifyAll(Database, {
  exclude: ['collection', 'get', 'getRefreshToken'],
  singular: true,
});

export default Database;

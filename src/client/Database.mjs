import { promisifyAll } from '@google-cloud/promisify';
import Firebase from 'firebase';
import Collection from './Collection';
import fetch from './fetch';

class Database {
  constructor(cfg) {
    this.cache = true;
    this.safe_writes = true;
    if (typeof cfg === 'string') {
      this.api = cfg;
      this.request({
        json: false,
        resource: 'Firebase',
      }, (url) => {
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

promisifyAll(Database, {
  exclude: ['collection', 'get', 'setToken'],
  singular: true,
});

export default Database;

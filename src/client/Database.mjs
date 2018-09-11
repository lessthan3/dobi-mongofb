

import Firebase from 'firebase';
import Collection from './Collection';
import fetch from './fetch';

export default class Database {
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
    let next = (err) => {
      if (err) {
        console.error(err);
      }
    };
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
      params,
      resource,
      url,
    })
      .then(data => next(null, data))
      .catch(err => next(err));
  }

  auth(token, next) {
    if (typeof next !== 'function') {
      console.warn('callback required');
    }
    return this.firebase.authWithCustomToken(token, () => {
      this.token = token;
      return next();
    });
  }

  setToken(token) {
    this.token = token;
  }
}

import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import * as promisify from '@google-cloud/promisify';
import isNil from 'lodash/isNil';
import set from 'lodash/set';
import some from 'lodash/some';
import trimEnd from 'lodash/trimEnd';
import { isEqual } from './utils';
import EventEmitter from './EventEmitter';

const { promisifyAll } = promisify;

class DocumentRef extends EventEmitter {
  constructor(document, path = []) {
    super();
    this.document = document;
    this.counter = ++DocumentRef._counter;
    this.collection = this.document.collection;
    this.database = this.collection.database;
    this.path = path;
    this.key = trimEnd(`${[this.document.key, ...this.path].join('/')}`, '/');
    const dataCopy = cloneDeep(this.document.data);
    this.data = this.path.length ? get(dataCopy, this.path) : dataCopy;
    this.ref = this.database.firebase.database().ref(this.key);
  }

  log(...args) {
    // eslint-disable-next-line no-console
    return console.log(`ref_${this.counter}`, args);
  }

  get(pathStr) {
    const path = pathStr.split(/[./]/g).reduce((arr, part) => {
      // eslint-disable-next-line no-unused-expressions
      part === '..' ? arr.pop() : arr.push(part);
      return arr;
    }, cloneDeep(this.path));

    return new DocumentRef(this.document, path);
  }

  name() {
    return this.path.length === 0 ? this.data._id : this.path[this.path.length - 1];
  }

  // value: emit now and when updated
  // update: emit only when updated
  on(event, handler) {
    super.on(event, handler);
    const { update, value } = this.events;

    if ((!isNil(value) && value.length)
      || (!isNil(update) && update.length)
    ) {
      this.emit('value', this.val());
      this.ref.on('value', snapshot => this.updateData(snapshot.val()));
    }
  }

  parent() {
    return new DocumentRef(this.document, this.path.slice(0, this.path.length - 1));
  }

  off(event, handler = null) {
    super.off(event, handler);
    const { update, value } = this.events;

    if (!(update && update.length > 0)
      && !(value && value.length > 0)
    ) {
      this.ref.off('value');
    }
  }

  refresh(next) {
    return this.ref.once('value', (snapshot) => {
      this.updateData(snapshot.val());
      next();
    });
  }

  remove(next) {
    return this.set(null, next);
  }

  set(value, next) {
    // if specific fields were queried for, only allow those to be updated
    const { safeWrites } = this.database;
    const { fields } = this.document.query;
    if (safeWrites && fields) {
      const keys = Object.keys(fields);
      const fail = some(keys, (key) => {
        const dst = `${this.document.key}/${key.replace(/\./g, '/')}`;
        return this.key.indexOf(dst) !== 0;
      });

      if (fail) {
        return next('cannot set a field that was not queried for');
      }
    }

    return this.database.request({
      data: {
        value,
      },
      method: 'PATCH',
      resource: this.path.length
        ? `${this.document.key}/${this.path.join('/')}`
        : this.document.key,
    }).then(({ value }) => {
      this.updateData(value);
      next(null, value);
    })
      .catch(err => next(err));
  }

  // @data = what we got from mongodb or what was already updated here
  // data = new data from firebase
  updateData(_data) {
    const data = _data;
    // ignore special 'created' and 'last_modified' fields on documents
    if (this.key === this.document.key && this.data) {
      if (this.data.created) {
        data.created = this.data.created;
      }
      if (this.data.last_modified) {
        data.last_modified = this.data.last_modified;
      }
    }

    // no updates to send if data isn't changing
    if (isEqual(this.data, data)) {
      return;
    }

    // update DocumentRef data
    this.data = cloneDeep(data);

    // update document data. this will allow handlers to use
    // ref.get and have access to new data
    if (this.path.length === 0) {
      this.document.data = cloneDeep(data);
    } else {
      set(this.document.data, this.path, cloneDeep(data));
    }

    // emit the updates
    this.emit('update', this.val());
    this.emit('value', this.val());
  }

  val() {
    return cloneDeep(this.data);
  }
}

DocumentRef._counter = 0;

promisifyAll(DocumentRef, {
  exclude: [
    'get',
    'log',
    'name',
    'off',
    'on',
    'parent',
    'updateData',
    'val',
  ],
  singular: true,
});

export default DocumentRef;

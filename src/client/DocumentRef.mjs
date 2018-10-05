import promisify from '@google-cloud/promisify';
import set from 'lodash/set';
import cloneDeep from 'lodash/cloneDeep';
import some from 'lodash/some';
import EventEmitter from './EventEmitter';
import { isEqual, startsWith } from './utils';

const { promisifyAll } = promisify;

class DocumentRef extends EventEmitter {
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
    this.data = cloneDeep(this.document.data);

    for (const k of this.path) {
      if (k !== '' && this.data != null) {
        this.data = this.data[k];
      }
    }

    this.ref = this.database.firebase.database().ref(this.key);
  }

  log(...args) {
    // eslint-disable-next-line no-console
    return console.log(`ref_${this.counter}`, args);
  }

  get(_path) {
    let path = _path;
    const temp = cloneDeep(this.path);
    while (startsWith(path, '..')) {
      temp.pop();
      path = path.slice(2);
      if (startsWith(path, '/')) {
        path = path.slice(1);
      }
    }
    return new DocumentRef(this.document, `${temp.join('/')}/${path}`);
  }

  name() {
    if ((this.path.length === 1) && (this.path[0] === '')) {
      return this.data._id;
    }
    return this.path[this.path.length - 1];
  }

  // value: emit now and when updated
  // update: emit only when updated
  on(event, handler) {
    super.on(event, handler);

    if ((this.events.value && this.events.value.length)
      || (this.events.update && this.events.update.length)
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

    if (!(this.events.update && this.events.update.length > 0)
      && !(this.events.value && this.events.value.length > 0)
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
    if (this.database.safeWrites) {
      let allow = true;
      if (this.document.query.fields) {
        const keys = Object.keys(this.document.query.fields);
        allow = some(keys, (key) => {
          const dst = `${this.document.key}/${key.replace(/\./g, '/')}`;
          return this.key.indexOf(dst) === 0;
        });
      }
      if (!allow) {
        return next('cannot set a field that was not queried for');
      }
    }

    const ref = this.database.firebase.database().ref(this.key);
    return ref.set(value)
      .then(async () => {
        await this.database.request({
          resource: `sync/${this.key}`,
        });
        this.updateData(value);
        next();
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
    if ((this.path.length === 1) && (this.path[0] === '')) {
      this.document.data = cloneDeep(data);
    } else {
      set(this.document.data, this.path.join('.'), cloneDeep(data));
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

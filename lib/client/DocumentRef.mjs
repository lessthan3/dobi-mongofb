

import EventEmitter from './EventEmitter';
import { isEquals, log, startsWith } from './utils';

const DocumentRef = class DocumentRef extends EventEmitter {
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
      return log('invalid callback function to remove');
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
    if (isEquals(this.data, data)) {
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
      return [...this.data];
    }
    if (typeof this.data === 'object') {
      return { ...this.data };
    }
    return this.data;
  }
};

DocumentRef._counter = 0;

export default DocumentRef;

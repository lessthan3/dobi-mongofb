import { promisifyAll } from '@google-cloud/promisify';
import DocumentRef from './DocumentRef';

class Document {
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
    return this.collection.removeById(this.data._id, next);
  }

  save(next) {
    return this.ref.set(this.data, next);
  }

  set(value, next) {
    return this.ref.set(value, next);
  }

  val() {
    return this.ref.val();
  }
}

promisifyAll(Document, {
  exclude: [
    'emit',
    'get',
    'off',
    'on',
    'name',
    'val',
  ],
});

export default Document;

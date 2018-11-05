import { promisifyAll } from '@google-cloud/promisify';
import CollectionRef from './CollectionRef';
import Document from './Document';
import { prepareFind } from './utils';

class Collection {
  constructor(database, name) {
    this.database = database;
    this.name = name;
    this.ref = new CollectionRef(this);
  }

  insert(doc, _priority, _next) {
    const [next, priority] = typeof _priority === 'function'
      ? [_priority, null] : [_priority, _next];
    this.database.request({
      data: { priority, value: doc },
      method: 'POST',
      params: {
        _: Date.now(),
      },
      resource: this.name,
    }).then(data => (
      next(null, new Document(this, data))
    )).catch(err => next(err));
  }

  /**
   * @param {Object} criteria
   * @param {Object} fields
   * @param {Object} options
   * @param {Function} next
   */
  find(...args) {
    const { params, query, next } = prepareFind(args);

    this.database.request({
      method: 'GET',
      params,
      resource: `${this.name}`,
    })
      .then((datas) => {
        const output = datas.map(data => (
          new Document(this, data, query)
        ));
        next(null, output);
      })
      .catch(err => next(err));
  }

  /**
   * @param {Object} criteria
   * @param {Object} fields
   * @param {Object} options
   * @param {Function} next
   */
  findById(...args) {
    const [id] = args;
    const updatedArgs = [{ _id: id }, ...args.slice(1, args.length)];
    const { params, next } = prepareFind(updatedArgs, { limit: 1 });

    return this.database.request({
      method: 'GET',
      params,
      resource: `${this.name}/${id}`,
    })
      .then((data) => {
        const doc = data ? new Document(this, data) : null;
        return next(null, doc);
      })
      .catch(err => next(err));
  }

  /**
   * @param {Object} criteria
   * @param {Object} fields
   * @param {Object} options
   * @param {Function} next
   */
  findOne(...args) {
    const { query, params, next } = prepareFind(args, { limit: 1 });
    return this.database.request({
      method: 'GET',
      params,
      resource: `${this.name}`,
    })
      .then(([data] = []) => {
        const doc = data ? new Document(this, data, query) : null;
        return next(null, doc);
      })
      .catch(err => next(err));
  }

  list(priority, limit) {
    return this.ref.limitToFirst(limit == null ? 1 : limit).endAt(priority);
  }

  removeById(_id, next) {
    // sync result to mongodb
    return this.database.request({
      method: 'DELETE',
      resource: `${this.name}/${_id}`,
    })
      .then(next)
      .catch(err => next(err));
  }
}

promisifyAll(Collection, { exclude: ['list', 'limit'], singular: true });

export default Collection;

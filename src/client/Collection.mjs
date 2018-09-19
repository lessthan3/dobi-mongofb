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

  insert(_doc, _priority, _next) {
    const doc = _doc;
    let next = _next;
    let priority = _priority;
    if (typeof priority === 'function') {
      [next, priority] = [priority, null];
    }
    this.database.request({
      json: false,
      params: {
        _: `${Date.now()}-${Math.random()}`,
      },
      resource: 'ObjectID',
    })
      .then(async (id) => {
        doc._id = id;
        const ref = this.database.firebase.database().ref(`${this.name}/${id}`);
        await ref.set(doc);
        if (priority) {
          await ref.setPriority(priority);
        }
        return id;
      })
      .then(async (id) => {
        const data = await this.database.request({
          params: {
            _: Date.now(),
          },
          resource: `sync/${this.name}/${id}`,
        });
        return next(null, new Document(this, data));
      })
      .catch(err => next(err));
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
    const [query, params, next] = prepareFind(criteria, fields, options, _next);

    this.database.request({
      params,
      resource: `${this.name}/find`,
    })
      .then((datas) => {
        const output = datas.map(data => (
          new Document(this, data, query)
        ));
        next(null, output);
      })
      .catch(err => next(err));
  }

  findById(id = null, fields = null, options = null, _next = null) {
    const [, params, next] = prepareFind(id, fields, options, _next);

    return this.database.request({
      params,
      resource: `${this.name}/${id}`,
    })
      .then((data) => {
        const doc = data ? new Document(this, data) : null;
        return next(null, doc);
      })
      .catch(err => next(err));
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
    const [query, params, next] = prepareFind(criteria, fields, options, _next);

    return this.database.request({
      params,
      resource: `${this.name}/findOne`,
    })
      .then((data) => {
        const doc = data ? new Document(this, data, query) : null;
        return next(null, doc);
      })
      .catch(err => next(err));
  }

  list(priority, limit) {
    return this.ref.limitToFirst(limit == null ? 1 : limit).endAt(priority);
  }

  removeById(_id, next) {
    const ref = this.database.firebase.database().ref(`${this.name}/${_id}`);

    // store current value
    return ref.once('value', (snapshot) => {
      const oldData = snapshot.val();

      // remove value from firebase
      return ref.set(null, (refSetErr) => {
        if (refSetErr) {
          return next(refSetErr);
        }

        // sync result to mongodb
        return this.database.request({
          resource: `sync/${this.name}/${_id}`,
        }, (syncErr) => {
          // if sync failed, rollback data
          if (syncErr) {
            return ref.set(oldData, (err) => {
              if (err) {
                return next(`sync failed, and rollback failed: ${syncErr.toString()}`);
              }
              return next(`sync failed, data rollback successful: ${syncErr.toString()}`);
            });

            // sync successful
          }
          return next(null);
        });
      });
    });
  }
}

promisifyAll(Collection, { exclude: ['list', 'limit'], singular: true });

export default Collection;

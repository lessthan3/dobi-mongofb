import CollectionRef from './CollectionRef';
import Document from './Document';
import { prepareFind } from './utils';

const Collection = class Collection {
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
    if (typeof next !== 'function') {
      next = (err) => {
        if (err) {
          console.error(err);
        }
      };
    }
    return this.database.request('ObjectID', false, {
      _: `${Date.now()}-${Math.random()}`,
    }, (requestErr, id) => {
      if (requestErr) {
        return next(requestErr);
      }
      doc._id = id;
      const ref = this.database.firebase.child(`${this.name}/${id}`);
      return ref.set(doc, (setErr) => {
        if (setErr) {
          return next(setErr);
        }
        if (priority) {
          ref.setPriority(priority);
        }
        return this.database.request(`sync/${this.name}/${id}`, {
          _: Date.now(),
        }, (err, data) => {
          if (err) {
            return next(err);
          }
          return next(null, new Document(this, data));
        });
      });
    });
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

    return this.database.request(`${this.name}/find`, params, (err, datas) => {
      if (err) {
        return next(err);
      }
      const output = [];
      for (const data of datas) {
        output.push(new Document(this, data, query));
      }
      return next(null, output);
    });
  }

  findById(id = null, fields = null, options = null, _next = null) {
    const [, params, next] = prepareFind(id, fields, options, _next);

    return this.database.request(`${this.name}/${id}`, params, (err, data) => {
      if (err) {
        return next(err);
      }
      if (!data) {
        return next(null, null);
      }
      return next(null, new Document(this, data));
    });
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

    return this.database.request(`${this.name}/findOne`, params, (err, data) => {
      if (err) {
        return next(err);
      }
      if (!data) {
        return next(null, null);
      }
      return next(null, new Document(this, data, query));
    });
  }

  list(priority, _limit) {
    const limit = _limit == null ? 1 : _limit;
    this.ref.endAt(priority);
    this.ref.limit(limit);
    return this.ref;
  }

  removeById(_id, _next) {
    let next = _next;
    if (typeof next !== 'function') {
      next = (err) => {
        if (err) {
          console.error(err);
        }
      };
    }
    const ref = this.database.firebase.child(`${this.name}/${_id}`);

    // store current value
    return ref.once('value', (snapshot) => {
      const oldData = snapshot.val();

      // remove value from firebase
      return ref.set(null, (refSetErr) => {
        if (refSetErr) {
          return next(refSetErr);
        }

        // sync result to mongodb
        return this.database.request(`sync/${this.name}/${_id}`, (syncErr) => {
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
          return (
            typeof next === 'function' ? next(null) : undefined
          );
        });
      });
    });
  }
};

export default Collection;

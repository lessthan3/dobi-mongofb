import assert from 'assert';
import entries from 'lodash/entries';
import isPlainObject from 'lodash/isPlainObject';
import get from 'lodash/get';
import keys from 'lodash/keys';
import hasIn from 'lodash/hasIn';
import pickBy from 'lodash/pickBy';
import isNil from 'lodash/isNil';
import sortBy from 'lodash/sortBy';
import reverse from 'lodash/reverse';
import mongodb from 'mongodb';
import {
  alphaAdminUser, alphaUser, betaUser, documents, newPageId,
} from './mockDocuments';

const { ObjectId } = mongodb;

const filterCollection = (docs, query) => docs.filter((doc) => {
  for (const [key, value] of entries(query)) {
    if (!hasIn(doc, key)) {
      return false;
    }
    if (isPlainObject(value) && value.$in) {
      const values = key === '_id'
        ? value.$in.map(id => id.toString())
        : value.$in;
      const docValue = key === '_id'
        ? get(doc, key).toString()
        : get(doc, key);

      if (!values.includes(docValue)) {
        return false;
      }
    } else if (key === '_id') {
      if (value.toString() !== doc._id.toString()) {
        return false;
      }
    }
  }
  return true;
});

export const createMongoMock = (jest) => {
  const deleteOneMock = jest.fn((collection, query) => {
    const { [collection]: docs } = documents;
    assert(docs, `mongoMock: deleteOne invalid collection: ${collection}`);
    const results = filterCollection(docs, query);
    assert(results.length, `mongoMock: deleteOne did not find doc: ${JSON.stringify(query)}`);
    assert(results.length === 1, `mongoMock: deleteOne found more than one doc: ${JSON.stringify(query)}`);
    return results[0];
  });
  const insertOneMock = jest.fn((collection, document) => {
    assert(isPlainObject(document), 'mongoMock: insertOne didnt get doc');
    assert(!document._id, 'mongoMock: insertOne document has _id');
    assert(collection === 'pages', `mongoMock: insertOne not mocked for ${collection}`);
    return { insertedId: new ObjectId(newPageId) };
  });
  const findOneMock = jest.fn((collection, query, options = {}) => {
    const { [collection]: docs } = documents;
    assert(docs, `mongoMock: findOne invalid collection: ${collection}`);
    assert(query, 'mongoMock: findOne didnt receive query');
    const { projection } = options;
    const results = filterCollection(docs, query);
    if (results.length === 0) {
      return null;
    }
    const [result] = results;
    if (projection) {
      return pickBy(result, (value, key) => keys(projection).includes(key));
    }
    return result;
  });
  const findMock = jest.fn((collection, query, options) => ({
    toArray: (() => {
      const { [collection]: docs } = documents;
      assert(docs, `mongoMock: find invalid collection: ${collection}`);
      assert(query, 'mongoMock: find didnt receive query');
      const { projection, sort, limit } = options;
      let results = filterCollection(docs, query);
      if (results.length === 0) {
        return [];
      }
      if (projection) {
        results = results.map(result => (
          pickBy(result, (value, key) => keys(projection).includes(key))
        ));
      }
      if (sort) {
        for (const [key, direction] of entries(sort)) {
          results = sortBy(results, item => item[key]);
          if (!direction) {
            results = reverse(results);
          }
        }
      }
      if (!isNil(limit) && limit >= 0) {
        results = results.slice(0, limit);
      }
      return results;
    }),
  }));
  const updateMock = jest.fn((collection, query, updatedDoc) => {
    const { [collection]: docs } = documents;
    assert(docs, `mongoMock: update invalid collection: ${collection}`);
    assert(query, 'mongoMock: update didnt receive query');
    assert(updatedDoc, 'mongoMock: update didnt receive updatedDoc');
    const results = filterCollection(docs, query);
    assert(results.length, 'mongoMock: update didnt find doc to update');
    return {
      postUpdate: { ...updatedDoc },
      preUpdate: { ...results[0] },
    };
  });
  const collectionMock = jest.fn(collection => ({
    deleteOne: (...args) => (
      deleteOneMock.apply(this, [collection, ...args])
    ),
    find: (...args) => (
      findMock.apply(this, [collection, ...args])
    ),
    findOne: (...args) => (
      findOneMock.apply(this, [collection, ...args])
    ),
    insertOne: (...args) => (
      insertOneMock.apply(this, [collection, ...args])
    ),
    update: (...args) => (
      updateMock.apply(this, [collection, ...args])
    ),
  }));

  const mongodbMock = {
    MongoClient: {
      connect: () => ({
        db: () => ({ collection: collectionMock }),
      }),
    },
    ObjectId,
  };

  return {
    collectionMock,
    deleteOneMock,
    findMock,
    findOneMock,
    insertOneMock,
    mongodbMock,
    updateMock,
  };
};

export const createFirebaseMock = (jest) => {
  const verifyIdTokenMock = jest.fn((idToken) => {
    const users = {
      alphaAdminUser,
      alphaUser,
      betaUser,
    };
    assert(users[idToken], 'mock: invalid idToken');
    return { user: { ...users[idToken] } };
  });
  const authMock = jest.fn(() => ({
    verifyIdToken: verifyIdTokenMock,
  }));
  const setMock = jest.fn();
  const refMock = jest.fn(() => ({ set: setMock }));
  const databaseMock = jest.fn(() => ({ ref: refMock }));
  const initializeAppMock = jest.fn(() => ({
    auth: authMock,
    database: databaseMock,
  }));
  const adminMock = {
    credential: {
      cert: val => val,
    },
    initializeApp: initializeAppMock,
  };

  return {
    adminMock,
    authMock,
    databaseMock,
    initializeAppMock,
    refMock,
    setMock,
    verifyIdTokenMock,
  };
};

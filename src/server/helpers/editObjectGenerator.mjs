import assert from 'assert';
import createError from 'http-errors';
import mongodb from 'mongodb';

const { ObjectId } = mongodb;

/**
 * @param {Object} params
 * @param {Object} params.fbAdminShards
 * @param {Object} params.db
 * @return {Promise<null>}
 */
export default ({
  db,
  fbAdminShards,
}) => async ({
  collection,
  key,
  objectId,
  value: ogValue,
}) => {
  assert(collection, 'collection required');
  assert(objectId, 'objectId required');
  assert(key, 'key required');
  const keyParts = key.split('/');
  assert(keyParts.length >= 2, 'invalid key');
  assert((keyParts[0] === collection) && (keyParts[1] === objectId),
    'collection and objectId mismatch');

  const value = {
    ...ogValue,
    created: ogValue.created || Date.now(),
    last_modified: Date.now(),
  };

  const isRootWrite = `${collection}/${objectId}` === key;
  const $set = isRootWrite ? {
    ...value,
    _id: new ObjectId(objectId),
  } : {
    [key.split('/').join('.')]: value,
  };

  try {
    // write to mongo
    await db.collection(collection).updateOne({
      _id: new ObjectId(objectId),
    }, { $set }, {
      upsert: true,
    });
  } catch (err) {
    throw createError(400, err);
  }

  try {
    // write to firebase shards
    const promises = Object.values(fbAdminShards).map(async fb => (
      fb.database().ref(`${collection}/${objectId}`).set(value)
    ));
    await Promise.all(promises);
  } catch (err) {
    throw createError(500, err);
  }
};

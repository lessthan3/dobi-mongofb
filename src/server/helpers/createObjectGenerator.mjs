import assert from 'assert';
import createError from 'http-errors';
import isPlainObject from 'lodash/isPlainObject';

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
  value: ogValue,
}) => {
  assert(collection, 'collection required');
  assert(isPlainObject(ogValue), 'value must be an object');
  const value = {
    ...ogValue,
    created: ogValue.created || Date.now(),
    last_modified: Date.now(),
  };

  // make sure
  let objectId;
  try {
    // write to mongo
    const { insertedId } = await db.collection(collection).insertOne(value);
    objectId = insertedId.toString();
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

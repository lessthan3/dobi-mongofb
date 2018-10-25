
// sync data from firebase
// NOTE: requires _id to be an ObjectID
// db.collection.update
// db.collection.insert
// db.collection.remove
// the format is /sync/:collection/:id and not /:collection/:sync/:id to
// match firebase urls. the key in firebase is /:collection/:id
import mongodb from 'mongodb';
import createError from 'http-errors';
import { asyncWrapper, handleError, hook } from '../helpers';

const { ObjectID } = mongodb;

const sync = ({
  hasPermission,
  hooks,
  setCreated,
  setLastModified,
}) => async (req, res) => {
  const {
    db,
    fbAdminShards,
    params: {
      collection,
      id,
    },
    shard,
    user,
  } = req;

  if (!shard) {
    return res.status(400).send('shard required');
  }

  if (!user) {
    return res.status(401);
  }

  const dbCollection = db.collection(collection);

  // get data
  const ref = fbAdminShards[shard].database().ref(`${collection}/${id}`);
  const snapshot = await ref.once('value');
  const doc = snapshot.val();

  // convert _id if using ObjectIDs
  let qry;
  try {
    qry = { _id: new ObjectID(req.params.id) };
  } catch (error) {
    return handleError(res, 'Invalid ObjectID');
  }

  // send null if collection in blacklist
  // WARNING: IF YOU ATTEMPT TO SYNC A COLLECTION ITEM NOT
  // ON YOUR FIREBASE AND CALL SYNC, IT WILL GET DESTROYED
  const permission = await hasPermission(req, res);
  if (!permission) {
    return res.send(null);
  }

  // insert/update
  if (doc) {
    // set created and last modified
    if (setCreated && !doc.created) {
      doc.created = Date.now();
    }
    if (setLastModified) {
      doc.last_modified = Date.now();
    }

    doc._id = qry._id;
    try {
      await dbCollection.updateOne(qry, { $set: doc }, { upsert: true });
    } catch (err) {
      throw createError(400, 'mongo sync failed');
    }

    try {
      const promises = Object.entries(fbAdminShards).map(async ([shardName, fbAdmin]) => {
        if (shard === shardName) {
          return;
        }
        await fbAdmin.database().ref(`${collection}/${doc._id.toString()}`).set(doc);
      });
      await Promise.all(promises);
    } catch (err) {
      throw createError(500, 'firebase sync failed');
    }

    const transformedDoc = hook({
      hooks,
      method: 'find',
      req,
      time: 'after',
    }, doc);
    return res.send(transformedDoc);
  }

  // remove
  try {
    await dbCollection.removeOne(qry);
  } catch (err) {
    throw createError(400, 'mongo sync failed');
  }

  try {
    const promises = Object.entries(fbAdminShards).map(async ([shardName, fbAdmin]) => {
      if (shard === shardName) {
        return;
      }
      await fbAdmin.database().ref(`${collection}/${doc._id.toString()}`).set(null);
    });
    await Promise.all(promises);
  } catch (err) {
    throw createError(500, 'firebase sync failed');
  }

  return res.sendStatus(200);
};


/**
 * @param {Object} params
 * @param {Function} params.hasPermission
 * @param {Object} params.hooks
 * @param {boolean} params.setCreated
 * @param {boolean} params.setLastModified
 */
export default params => asyncWrapper(sync(params));

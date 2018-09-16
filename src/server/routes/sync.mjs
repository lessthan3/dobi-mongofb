
// sync data from firebase
// NOTE: requires _id to be an ObjectID
// db.collection.update
// db.collection.insert
// db.collection.remove
// the format is /sync/:collection/:id and not /:collection/:sync/:id to
// match firebase urls. the key in firebase is /:collection/:id
import { ObjectID } from 'mongodb';
import { handleError, hook } from '../helpers';

const asyncOnceValue = ref => new Promise(resolve => (
  ref.once('value', snapshot => resolve(snapshot))
));

/**
 * @param {Object} params
 * @param {Function} params.hasPermission
 * @param {Object} params.hooks
 * @param {boolean} params.setCreated
 * @param {boolean} params.setLastModified
 * @param {boolean} params.useObjectId
 */
export default ({
  hasPermission,
  hooks,
  setCreated,
  setLastModified,
  useObjectId,
}) => async (req, res) => {
  const {
    db,
    fb,
    params: {
      collection,
      id,
    },
  } = req;

  const dbCollection = db.collection(collection);

  // get data
  const ref = fb.child(`${collection}/${id}`);
  const snapshot = await asyncOnceValue(ref);
  const doc = snapshot.val();

  let qry;

  // convert _id if using ObjectIDs
  if (useObjectId) {
    try {
      qry = { _id: new ObjectID(req.params.id) };
    } catch (error) {
      return handleError(res, 'Invalid ObjectID');
    }
  }

  // send null if collection in blacklist
  // WARNING: IF YOU ATTEMPT TO SYNC A COLLECTION ITEM NOT
  // ON YOUR FIREBASE AND CALL SYNC, IT WILL GET DESTROYED
  if (!hasPermission(req, res)) {
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
    const opt = { upsert: true };
    await dbCollection.updateOne(qry, { $set: doc }, opt);
    hook({
      hooks,
      method: 'find',
      req,
      time: 'after',
    }, doc);
    return res.send(doc);
  }

  // remove
  await dbCollection.removeOne(qry);
  return res.sendStatus(200);
};

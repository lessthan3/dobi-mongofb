import isPlainObject from 'lodash/isPlainObject';
import values from 'lodash/values';

export default async (ctx) => {
  const {
    collection,
    db,
    fbAdminShards,
    firebaseWriteKey,
    firebaseWriteValue,
    id,
    ObjectId,
    updatedDocument,
  } = ctx.state;
  ctx.assert(collection, 500, 'insert: missing collection from state');
  ctx.assert(db, 500, 'insert: missing db from state');
  ctx.assert(fbAdminShards, 500, 'insert: missing fbAdminShards from state');
  ctx.assert(firebaseWriteKey, 500, 'insert: missing firebaseWriteKey from state');
  ctx.assert(firebaseWriteKey.length >= 2, 500, 'insert: firebaseWriteKey invalid length');
  ctx.assert(firebaseWriteValue !== undefined, 500, 'insert: missing firebaseWriteValue from state');
  ctx.assert(id, 500, 'insert: missing mongoId from state');
  ctx.assert(ObjectId, 500, 'insert: missing ObjectId, from state');
  ctx.assert(ObjectId.isValid(id), 500, 'insert: invalid id from state');
  ctx.assert(updatedDocument, 500, 'insert: missing updatedDocument from state');
  ctx.assert(
    isPlainObject(updatedDocument),
    500,
    'insert: for some reason the document isn\'t an object',
  );
  ctx.assert(
    (updatedDocument._id === id),
    500,
    'insert: doc _id doesn\'t match id in state',
  );

  try {
    await db.collection(collection).update({
      _id: new ObjectId(id),
    }, {
      ...updatedDocument,
      _id: new ObjectId(id),
    });
  } catch (err) {
    ctx.throw(400, err.toString());
  }

  try {
    const promises = values(fbAdminShards).map(async fbAdmin => (
      fbAdmin.database().ref(firebaseWriteKey.join('/')).set(firebaseWriteValue)
    ));
    await Promise.all(promises);
  } catch (err) {
    ctx.throw(500, 'firebase write failed');
  }

  ctx.status = 200;
  ctx.body = { value: firebaseWriteValue };
};

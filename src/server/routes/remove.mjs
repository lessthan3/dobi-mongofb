import values from 'lodash/values';

export default async (ctx) => {
  const {
    collection, db, fbAdminShards, id, ObjectId,
  } = ctx.state;

  ctx.assert(collection, 500, 'remove: missing collection from state');
  ctx.assert(db, 500, 'remove: missing db from state');
  ctx.assert(fbAdminShards, 500, 'insert: missing fbAdminShards from state');
  ctx.assert(id, 500, 'remove: missing id from state');
  ctx.assert(ObjectId, 500, 'remove: missing ObjectId on state');
  ctx.assert(ObjectId.isValid(id), 500, 'remove: invalid id from state');

  try {
    await db.collection(collection).deleteOne({
      _id: new ObjectId(id),
    });
  } catch (err) {
    ctx.throw(400, err.toString());
  }

  try {
    const promises = values(fbAdminShards).map(async fbAdmin => (
      fbAdmin.database().ref(`${collection}/${id}`).set(null)
    ));
    await Promise.all(promises);
  } catch (err) {
    ctx.throw(500, 'firebase sync failed');
  }
  ctx.status = 200;
};

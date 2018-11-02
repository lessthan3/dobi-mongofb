import values from 'lodash/values';

export default async (ctx) => {
  const {
    collection, db, fbAdminShards, insertValue,
  } = ctx.state;
  ctx.assert(collection, 500, 'insert: missing collection from state');
  ctx.assert(db, 500, 'insert: missing db from state');
  ctx.assert(fbAdminShards, 500, 'insert: missing fbAdminShards from state');
  ctx.assert(insertValue, 500, 'insert: missing insertValue from state');

  let insertedId;
  try {
    ({ insertedId } = await db.collection(collection).insertOne(insertValue));
  } catch (err) {
    ctx.throw(400, err.toString());
  }

  const document = {
    ...insertValue,
    _id: insertedId.toString(),
  };

  try {
    const promises = values(fbAdminShards).map(async fbAdmin => (
      fbAdmin.database().ref(`${collection}/${document._id}`).set(document)
    ));
    await Promise.all(promises);
  } catch (err) {
    ctx.throw(500, 'firebase sync failed');
  }

  ctx.status = 200;
  ctx.body = document;
};

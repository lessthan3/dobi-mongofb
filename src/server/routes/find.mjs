export default async (ctx) => {
  const { collection, db, mongoFbQuery } = ctx.state;
  ctx.assert(db, 500, 'find: missing db from state');
  ctx.assert(collection, 500, 'find: missing collection from state');
  ctx.assert(mongoFbQuery && mongoFbQuery.criteria, 500, 'find: missing mongoFbQuery from state');

  // parse db args
  const { criteria, options } = mongoFbQuery;
  let docs;
  try {
    docs = await db.collection(collection).find(criteria, options).toArray();
  } catch (err) {
    ctx.throw(400, err.toString());
  }
  ctx.assert(docs, 500, 'our database failed. please email dev@maestro.io.');
  ctx.body = docs.map(doc => ({ ...doc, _id: doc._id.toString() }));
  ctx.status = 200;
};

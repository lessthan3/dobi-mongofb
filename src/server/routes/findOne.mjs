import get from 'lodash/get';

export default async (ctx) => {
  const { collection, db, mongoFbQuery } = ctx.state;
  const { 0: path } = ctx.params;
  ctx.assert(db, 500, 'find: missing db from state');
  ctx.assert(collection, 500, 'find: missing collection from state');
  ctx.assert(mongoFbQuery && mongoFbQuery.criteria, 500, 'find: missing mongoFbQuery from state');

  // parse db args
  const { criteria, options } = mongoFbQuery;
  let doc;
  try {
    doc = await db.collection(collection).findOne(criteria, options);
  } catch (err) {
    ctx.throw(400, err.toString());
  }
  ctx.assert(doc, 404);
  const output = { ...doc, _id: doc._id.toString() };
  ctx.body = path ? get(output, path.split('/'), '') : output;
  ctx.status = 200;
};

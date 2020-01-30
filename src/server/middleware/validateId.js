export default async (ctx, next) => {
  const { collection, db, ObjectId } = ctx.state;
  const { id } = ctx.params;
  ctx.assert(db, 500, 'validateId: missing db on state');
  ctx.assert(ObjectId, 500, 'validateId: missing ObjectId on state');
  ctx.assert(collection, 500, 'validateId: missing collection from state');
  ctx.assert(id, 400, 'missing id');
  ctx.assert(ObjectId.isValid(id), 400, 'invalid id');

  let doc;
  try {
    doc = await db.collection(collection).findOne({
      _id: new ObjectId(id),
    });
  } catch (err) {
    ctx.throw(500, err.toString());
  }
  ctx.assert(doc, 404, 'object not found');

  ctx.state = {
    ...ctx.state,
    currentDocument: {
      ...doc,
      _id: doc._id.toString(),
    },
    id,
  };
  await next();
};

// sets collection onto state
export default async (ctx, next) => {
  const { db, mongoFbCollections } = ctx.state;
  const { collection } = ctx.params;
  ctx.assert(db, 500, 'validateCollection: db not found in state');
  ctx.assert(mongoFbCollections, 500, 'validateCollection: mongoFbCollections not found in state');
  if (!mongoFbCollections.includes(collection)) {
    ctx.throw(404);
    return;
  }
  ctx.state.collection = collection;
  await next();
};

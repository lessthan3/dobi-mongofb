const BAD_FORMAT_ERROR = (
  'Bad Authorization header format. Format is "Authorization: Bearer <token>'
);

// TODO: remove legacy support.
// sets admin and shard data on state
export default (forceAuth = false) => async (ctx, next) => {
  const {
    db, fbAdminShards, ObjectId,
  } = ctx.state;
  ctx.assert(db, 500, 'authGenerator: db not found on state');
  ctx.assert(ObjectId, 500, 'authGenerator: ObjectId not found on state');
  ctx.assert(fbAdminShards, 500, 'authGenerator: fbAdminShards not found on state');

  // parse authorization header
  const {
    authorization,
    'x-bearer-token-shard': shard,
  } = ctx.headers;

  let user;
  if (authorization) {
    const [scheme, idToken] = authorization.split(' ');
    ctx.assert(/^Bearer$/i.test(scheme), 401, BAD_FORMAT_ERROR);
    ctx.assert(idToken, 401, BAD_FORMAT_ERROR);
    ctx.assert(shard, 401, 'x-bearer-token-shard required');
    ctx.assert(fbAdminShards[shard], 401, 'invalid x-bearer-token-shard');
    try {
      const resp = await fbAdminShards[shard].auth().verifyIdToken(idToken);
      ({ user } = resp);
    } catch (authErr) {
      ctx.throw(401, `invalid token: ${authErr}`);
    }
  }

  if (forceAuth && !user) {
    ctx.throw(401);
  }


  ctx.state = {
    ...ctx.state,
    shard,
    user,
  };
  await next();
};

import { decode } from 'jwt-simple';

// TODO: remove legacy support.
export default legacySecretMap => async (req, res, next) => {
  const idToken = req.query.idToken || req.body.idToken;
  const token = req.query.token || req.body.token;
  const shard = req.query.shard || req.body.shard || req.primaryFirebaseShard;

  req.shard = shard;
  try {
    if (token) {
      const payload = decode(token, legacySecretMap[shard]);
      req.user = payload.d;
      req.admin = payload.admin;
      req.shard = shard;
    } else if (idToken) {
      const { admin, user } = await req.fbAdminShards[shard].auth().verifyIdToken(idToken);
      req.user = user;
      req.admin = admin;
      req.shard = shard;
    }
  } catch (authErr) {
    return res.status(401).send(`invalid token: ${authErr}`);
  }
  if (next) {
    return next();
  }
  return null;
};

import { decode } from 'jwt-simple';

// TODO: remove legacy support.
export default legacySecret => async (req, res, next) => {
  const idToken = req.query.idToken || req.body.idToken;
  const token = req.query.token || req.body.token;

  try {
    if (token) {
      const payload = decode(token, legacySecret);
      req.user = payload.d;
      req.admin = payload.admin;
    } else if (idToken) {
      const { admin, user } = await req.fbAdminPrimary.auth().verifyIdToken(idToken);
      req.user = user;
      req.admin = admin;
    }
  } catch (authErr) {
    return res.status(401).send(`invalid token: ${authErr}`);
  }
  if (next) {
    return next();
  }
  return null;
};

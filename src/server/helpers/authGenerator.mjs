import { decode } from 'jwt-simple';

// TODO: remove legacy support.
export default legacySecret => async (req, res, next) => {
  const idToken = req.query.idToken || req.body.idToken;
  const token = req.query.token || req.query.token;

  try {
    if (token) {
      const payload = decode(token, legacySecret);
      req.user = payload.d;
      req.admin = payload.admin;
    } else if (idToken) {
      const { admin, user } = await req.fbAdmin.auth().verifyIdToken(idToken);
      req.user = user;
      req.admin = admin;
    }
  } catch (authErr) {
    req.tokenParseError = authErr;
  }
  if (next) {
    return next();
  }
  return null;
};


// helpers
import jwt from 'jwt-simple';

export default firebaseConfig => (req, res, next) => {
  const token = req.query.token || req.body.token;
  if (token) {
    try {
      const payload = jwt.decode(token, firebaseConfig.secret);
      req.user = payload.d;
      req.admin = payload.admin;
    } catch (authErr) {
      req.token_parse_error = authErr;
    }
  }
  if (next) {
    return next();
  }
  return null;
};

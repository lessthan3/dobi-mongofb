import auth from './auth';

export default blacklist => async (req, res) => {
  await auth(req, res);
  if (req.admin) {
    return true;
  }
  return !blacklist.includes(req.params.collection);
};

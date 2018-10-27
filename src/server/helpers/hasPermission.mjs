export default ({ auth, blacklist }) => async (req, res, bypassAuth = false) => {
  await auth(req, res);
  // bypass auth allows calls to not allow admins to get collection
  if (req.admin && !bypassAuth) {
    return true;
  }
  return !blacklist.includes(req.params.collection);
};

export default ({ auth, blacklist }) => async (req, res) => {
  await auth(req, res);
  if (req.admin) {
    return true;
  }
  return !blacklist.includes(req.params.collection);
};

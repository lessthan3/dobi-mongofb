export default ({ auth, blacklist }) => (req, res) => {
  await auth(req, res);
  if (req.admin) {
    return true;
  }
  return !blacklist.includes(req.params.collection);
};

import authHelper from './auth';

export default ({ blacklist, firebaseConfig }) => {
  const auth = authHelper(firebaseConfig);
  return (req, res) => {
    auth(req, res);
    if (req.admin) {
      return true;
    }
    return !blacklist.includes(req.params.collection);
  };
};

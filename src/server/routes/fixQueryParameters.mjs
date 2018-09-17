export default (req, res, callback) => {
  const map = {
    false: false,
    null: null,
    true: true,
  };

  for (const k of Object.keys(req.query)) {
    const v = req.query[k];
    if (Object.keys(map).includes(v)) {
      req.query[k] = map[v];
    }
  }
  return callback();
};

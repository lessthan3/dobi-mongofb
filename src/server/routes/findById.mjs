export default (root, router) => (req, res, next) => {
  const query = {
    __single: true,
    criteria: JSON.stringify({ _id: req.params.id }),
  };
  if (req.params[1]) {
    const [, field] = req.params;
    query.__field = field;
  }
  return router.handle({
    ...req,
    query: {
      ...req.query,
      ...query,
    },
    url: `${root}/${req.params.collection}/find`,
  }, res, next);
};

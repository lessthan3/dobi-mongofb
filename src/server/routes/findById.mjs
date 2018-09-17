export default (root, router) => (req, res, next) => {
  router.handle({
    ...req,
    query: {
      ...req.query,
      __single: true,
      criteria: JSON.stringify({ _id: req.params.id }),
      __field: req.params[0] ? req.params[0] : undefined,
    },
    url: `${root}/${req.params.collection}/find`,
  }, res, next);
};

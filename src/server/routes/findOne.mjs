
export default (root, router) => (req, res, next) => router.handle({
  ...req,
  query: {
    ...req.query,
    __single: true,
  },
  url: `${root}/${req.params.collection}/find`,
}, res, next);

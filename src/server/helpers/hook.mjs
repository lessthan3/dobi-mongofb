import get from 'lodash/get';

/**
 * @param {Object} params
 * @param {Object} params.hooks
 * @param {string} params.method
 * @param {Object} params.req
 * @param {string} params.time
 * @param args
 * @return {*}
 */
export default ({
  hooks, method, req, time,
}, args) => {
  let fn;
  const { collection } = req.params;
  fn = get(hooks, [collection, time, method]);
  if (fn && typeof fn === 'function') {
    if (!Array.isArray(args)) {
      return fn.apply(req, [args]);
    }
    return fn.apply(req, args);
  }
  return args;
};

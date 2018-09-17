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
  const { collection } = req.params;
  const fn = get(hooks, [collection, time, method]);
  if (fn && typeof fn === 'function') {
    if (!Array.isArray(args)) {
      return fn.apply(null, [req, args]);
    }
    return fn.apply(null, [req, ...args]);
  }
  return args;
};

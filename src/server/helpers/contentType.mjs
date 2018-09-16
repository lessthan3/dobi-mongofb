/**
 * @param {Object} res
 * @param {string} type
 * @return {*}
 */
export default (res, type) => res.set('Content-Type', type);

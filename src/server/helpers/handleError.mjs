import contentType from './contentType';

/**
 * @param {Object} res
 * @param {Object|string} handleErr
 * @return {*}
 */
export default (res, handleErr) => {
  contentType(res, 'text/plain');
  return res.status(400).send(handleErr.toString());
};

import fs from 'fs';
import { contentType, handleError } from '../helpers';
import { dirname } from '../dirname';

/**
 * @param {Object} params.
 * @param {Function} params.cache
 * @param {boolean} params.minified
 */
export default ({ cache, minified = false }) => (req, res) => {
  contentType(res, 'text/javascript');
  return cache((callback) => {
    try {
      const fileName = minified ? 'client.min.js' : 'client.js';
      const script = fs.readFileSync(`${dirname}/../../dist/${fileName}`, 'utf-8');
      return callback(script);
    } catch (readErr) {
      return handleError(res, readErr);
    }
  })(req, res);
};

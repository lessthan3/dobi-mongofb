import mongodb from 'mongodb';
import createError from 'http-errors';
import get from 'lodash/get';
import trim from 'lodash/trim';
import { hook } from '../helpers';

const skipKeys = ['_', '__field', '__single', 'fields', 'limit', 'skip', 'sort'];

const parseJsonEncodedParams = req => ['criteria', 'fields', 'options'].reduce((obj, key) => {
  try {
    return {
      ...obj,
      [key]: req.query[key] ? JSON.parse(req.query[key]) : {},
    };
  } catch (err) {
    throw createError(400, `invalid ${key}`);
  }
}, {});

const parseSimpleHttpParams = ({
  query: {
    fields: reqFields,
    limit,
    skip,
    sort,
  },
  query,
}) => {
  const fields = reqFields ? reqFields.split(',')
    .reduce((obj, field) => ({
      ...obj,
      [field]: 1,
    }), {}) : {};

  const options = {
    limit: limit || undefined,
    skip: skip || undefined,
    sort: sort ? sort.split(',').reduce((arr, val, ind) => (
      [[...arr[0], (ind === 0 ? val : val || 'asc')]]
    ), [[]]) : undefined,
  };


  const criteria = Object.keys(query).reduce((obj, key) => {
    if (skipKeys.includes(key)) {
      return obj;
    }
    return { ...obj, [key]: query[key] };
  }, {});

  return { criteria, fields, options };
};

/**
 * @param {Object} params
 * @param {Function} params.hasPermission
 * @param {Object} params.hooks
 * @param {number} params.limitDefault
 * @param {number} params.limitMax
 * @param {Object} params.req
 * @param {Object} params.res
 * @return {*}
 */
const find = async ({
  hasPermission,
  hooks,
  limitDefault = undefined,
  limitMax = undefined,
  req,
  res,
}) => {
  const {
    params: {
      collection,
    },
    query: {
      __field,
      __single: forceSingle = false,
      criteria: reqCriteria,
      options: reqOptions,
    },
  } = req;

  // parse db args
  const { criteria, fields, options } = (reqCriteria || reqOptions)
    // use JSON encoded parameters
    ? parseJsonEncodedParams(req)
    // simple http queries
    : parseSimpleHttpParams(req);

  // apply limitDefault, forceSingle, than limitMax
  options.limit = Number.isInteger(options.limit) ? options.limit : limitDefault;
  options.limit = forceSingle ? 1 : options.limit;
  options.limit = limitMax && options.limit
    ? Math.min(options.limit, limitMax)
    : options.limit;

  // built-in hooks
  try {
    if (criteria._id) {
      if (typeof criteria._id === 'string') {
        criteria._id = new mongodb.ObjectID(criteria._id);
      } else if (criteria._id.$in) {
        criteria._id.$in = criteria._id.$in.map(id => new mongodb.ObjectID(id));
      }
    }
  } catch (error) {
    throw createError(400, 'Invalid ObjectID');
  }

  // don't allow $where clauses in the criteria
  if (criteria.$where) {
    throw createError(403, 'use of the $where operator is not allowed');
  }

  // dont make a DB call for blacklist
  // as mongo errors can be revealing
  if (!hasPermission(req, res)) {
    if (forceSingle) {
      throw createError(404);
    }
    return [];
  }

  // hooks
  const [hookedCriteria, hookedFields, hookedOptions] = hook({
    hooks,
    method: 'find',
    req,
    time: 'before',
  }, [criteria, fields, options]);

  // fields got moved into options for v3+ mongo
  hookedOptions.projection = Object.keys(hookedFields).length ? hookedFields : undefined;

  let docs = [];
  try {
    docs = await req.db.collection(collection).find(hookedCriteria, hookedOptions).toArray();
  } catch (err) {
    throw createError(400, err.toString());
  }

  docs = docs.map(doc => (
    hook({
      hooks,
      method: 'find',
      req,
      time: 'after',
    }, doc)
  ));

  // special options (mainly for use by findByID and findOne)
  if (__field) {
    const overrideFields = decodeURIComponent(__field).replace(/\//g, '.');
    docs = docs.map(doc => get(doc, trim(overrideFields, '.')));
  }
  if (forceSingle) {
    if (docs.length === 0) {
      throw createError(400);
    }
    return docs[0];
  }
  return docs;
};

/**
 * @param {Object} params
 * @param {Function} params.cache
 * @param {Function} params.hasPermission
 * @param {Object} params.hooks
 * @param {number} params.limitDefault
 * @param {number} params.limitMax
 * @return {*}
 */
export default ({
  cache,
  hasPermission,
  hooks,
  limitDefault,
  limitMax,
}) => (req, res) => cache(async (callback) => {
  try {
    const data = await find({
      hasPermission,
      hooks,
      limitDefault,
      limitMax,
      req,
      res,
    });
    return callback(data);
  } catch (err) {
    if (!err.statusCode) {
      // eslint-disable-next-line no-console
      console.error(err.stack || err);
      return res.sendStatus(500);
    }
    if (!err.message) {
      return res.sendStatus(err.statusCode);
    }
    return res.status(err.statusCode).send(err.message);
  }
})(req, res);

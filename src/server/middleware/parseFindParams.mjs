import isArray from 'lodash/isArray';
import hasIn from 'lodash/hasIn';

const parseJsonEncodedParams = params => ['criteria', 'fields', 'options']
  .reduce((obj, key) => ({
    ...obj,
    [key]: params[key] ? JSON.parse(params[key]) : {},
  }), {});

const skipKeys = ['_', '__field', '__single', 'fields', 'limit', 'skip', 'sort'];
const parseSimpleHttpParams = (query) => {
  const {
    fields: reqFields,
    limit,
    skip,
    sort,
  } = query;

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

// sets mongoFbQuery on state
export default async (ctx, next) => {
  const {
    collection,
    forceSingle,
    mongoFbLimitDefault,
    mongoFbLimitMax,
    ObjectId,
  } = ctx.state;

  ctx.assert(collection, 500, 'parseFindParams: missing collection from state');
  ctx.assert(
    [true, false].includes(forceSingle), 500, 'parseFindParams: missing forceSingle from state',
  );
  ctx.assert(
    mongoFbLimitDefault, 500, 'parseFindParams: missing mongoFbLimitDefault from state',
  );
  ctx.assert(
    mongoFbLimitMax, 500, 'parseFindParams: missing mongoFbLimitMax from state',
  );
  ctx.assert(
    ObjectId, 500, 'parseFindParams: missing ObjectId from state',
  );

  const {
    criteria: reqCriteria,
    options: reqOptions,
  } = ctx.request.query;

  const { criteria, fields, options } = (reqCriteria || reqOptions)
    // use JSON encoded parameters
    ? parseJsonEncodedParams(ctx.request.query)

    // simple http queries
    : parseSimpleHttpParams(ctx.request.query);

  // prevent $where clauses
  ctx.assert(!criteria.$where, 403, 'use of the $where operator is not allowed');

  // parse limit
  options.limit = Number.isInteger(options.limit) ? options.limit : mongoFbLimitDefault;
  options.limit = forceSingle ? 1 : options.limit;
  options.limit = Math.min(options.limit, mongoFbLimitMax);

  // parse id
  try {
    if (criteria._id) {
      if (typeof criteria._id === 'string') {
        const { _id: docId } = criteria;
        ctx.assert(ObjectId.isValid(docId), 400, 'invalid criteria _id');
        criteria._id = new ObjectId(criteria._id);
      } else if (hasIn(criteria, '_id.$in') && isArray(criteria._id.$in)) {
        const { $in: ids } = criteria._id;
        ctx.assert(isArray(ids), 400, 'invalid $in in _id.$in');
        ids.forEach((id) => {
          if (!ObjectId.isValid(id)) {
            ctx.throw(400, 'invalid id in _id.$in');
          }
        });
        criteria._id.$in = criteria._id.$in.map(id => new ObjectId(id));
      }
    }
  } catch (error) {
    ctx.throw(400, 'Invalid ObjectId');
  }

  ctx.state = {
    ...ctx.state,
    mongoFbQuery: {
      criteria,
      options: {
        ...options,
        projection: Object.keys(fields).length ? fields : undefined,
      },
    },
  };
  await next();
};

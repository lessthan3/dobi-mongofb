import isEqualWith from 'lodash/isEqualWith';

const customIsEqual = (a, b) => {
  if (typeof a === 'function' && typeof b === 'function') {
    return a.toString() === b.toString();
  }
  return undefined;
};

export const isEqual = (a, b) => (
  isEqualWith(a, b, customIsEqual)
);

// stringify json params
export const jsonify = (q) => {
  const o = {};
  for (const [k, v] of Object.entries(q)) {
    if (v) {
      o[k] = JSON.stringify(v);
    }
  }
  return o;
};

// prepare query parameters for a find
export const prepareFind = (..._args) => {
  let fields;
  let next;
  let options;
  let special;

  const args = _args.filter(arg => arg != null);

  // callback
  const hasCallback = typeof args[args.length - 1] === 'function';
  if (hasCallback) {
    next = args[args.length - 1];
  }

  // defaults
  let criteria = {};

  // query objects
  if (typeof args[0] === 'object') {
    [criteria] = args;
  }
  if (typeof args[1] === 'object') {
    [, fields] = args;
  }
  if (typeof args[2] === 'object') {
    [, , options] = args;
  }
  if (typeof args[3] === 'object') {
    [, , , special] = args;
  }

  // args[1] can be either fields or options or special
  // args[2] can be either options or special

  // case: special was in args[2]
  if (options && !special && (options.token || options._)) {
    [special, options] = [options, null];
  }

  // case: options was in args[1]
  if (fields && !options && (
    fields.limit || fields.skip || fields.sort
  )) {
    [options, fields] = [fields, null];
  }

  // case: special was in args[1]
  if (fields && !special && (
    fields.token || fields._
  )) {
    [special, fields] = [fields, null];
  }

  // format query objects and prepare to send
  const query = { criteria, fields, options };
  const params = jsonify(query);

  if (special && special.token) {
    params.token = special.token;
  }
  if (special && special._) {
    params._ = special._;
  }

  return [query, params, next];
};

export const startsWith = (str, target) => str.slice(0, target.length) === target;

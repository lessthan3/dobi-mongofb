import assert from 'assert';
import isEqualWith from 'lodash/isEqualWith';
import isNumber from 'lodash/isNumber';
import pickBy from 'lodash/pickBy';
import isPlainObject from 'lodash/isPlainObject';

export const isEqual = (a, b) => (
  isEqualWith(a, b, (aVal, bVal) => {
    if (typeof aVal === 'function' && typeof bVal === 'function') {
      return aVal.toString() === bVal.toString();
    }
    return undefined;
  })
);


// prepare query parameters for a find
export const prepareFind = (args, optionsOverrides) => {
  let criteria = null;
  let fields = null;
  let next;
  let options = null;

  if (args.length === 1) {
    ([next] = args);
    [criteria, fields, options] = [{}, {}, {}];
  } else if (args.length === 2) {
    ([fields, options] = [{}, {}]);
    ([criteria, next] = args);
  } else if (args.length === 3) {
    if (args[1] && (isNumber(args[1].limit) || isNumber(args[1].skip) || args[1].sort)) {
      ([criteria, options, next] = args);
      fields = {};
    } else {
      ([criteria, fields, next] = args);
      options = {};
    }
  } else if (args.length === 4) {
    ([criteria, fields, options, next] = args);
    if (args[1] && (isNumber(args[1].limit) || isNumber(args[1].skip) || args[1].sort)) {
      ([criteria, options, fields, next] = args);
    } else {
      ([criteria, fields, options, next] = args);
    }
  }
  assert(isPlainObject(criteria), 'criteria must be an object');
  assert(isPlainObject(fields), 'fields must be an object');
  assert(isPlainObject(options), 'options must be an object');
  assert(typeof next === 'function', 'callback must be a function');

  let projection;
  if (options.projection && Object.keys(options.projection).length) {
    projection = options.projection;
  } else if (fields && Object.keys(fields).length) {
    projection = fields;
  }

  options = {
    ...pickBy(options, (value, key) => key !== '_'),
    ...(options._ ? { _: options._ } : {}),
    ...(projection ? { projection } : {}),
    ...optionsOverrides,
  };

  const params = {
    _: options._ ? Date.now() : undefined,
    criteria: criteria ? JSON.stringify(criteria) : undefined,
    options: JSON.stringify(options),
  };

  // format query objects and prepare to send
  const query = {
    criteria: criteria || {},
    options,
  };

  return { next, params, query };
};

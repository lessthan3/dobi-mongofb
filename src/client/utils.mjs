import isEqualWith from 'lodash/isEqualWith';
import isNumber from 'lodash/isNumber';

export const isEqual = (a, b) => (
  isEqualWith(a, b, (aVal, bVal) => {
    if (typeof aVal === 'function' && typeof bVal === 'function') {
      return aVal.toString() === bVal.toString();
    }
    return undefined;
  })
);


// prepare query parameters for a find
export const prepareFind = (args) => {
  let criteria = null;
  let fields = null;
  let next;
  let options = null;

  if (args.length === 1) {
    ([next] = args);
  } else if (args.length === 2) {
    ([criteria, next] = args);
  } else if (args.length === 3) {
    if (args[1] && (isNumber(args[1].limit) || isNumber(args[1].skip) || args[1].sort)) {
      ([criteria, options, next] = args);
    } else {
      ([criteria, fields, next] = args);
    }
  } else if (args.length === 4) {
    ([criteria, fields, options, next] = args);
    if (args[1] && (isNumber(args[1].limit) || isNumber(args[1].skip) || args[1].sort)) {
      ([criteria, options, fields, next] = args);
    } else {
      ([criteria, fields, options, next] = args);
    }
  }

  const params = {
    _: options && options._ ? options._ : undefined,
    criteria: criteria ? JSON.stringify(criteria) : undefined,
    fields: fields ? JSON.stringify(fields) : undefined,
    options: options ? JSON.stringify(options) : undefined,
  };

  // format query objects and prepare to send
  const query = {
    criteria: criteria || {},
    fields,
    options,
  };

  return { next, params, query };
};

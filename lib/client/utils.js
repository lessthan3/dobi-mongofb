"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startsWith = exports.prepareFind = exports.jsonify = exports.log = exports.isEquals = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var isEquals = function isEquals(a, b) {
  if (a && !b) {
    return false;
  }

  if (b && !a) {
    return false;
  }

  if ((0, _typeof2.default)(a) !== (0, _typeof2.default)(b)) {
    return false;
  }

  if (a === null && b === null) {
    return true;
  }

  switch ((0, _typeof2.default)(a)) {
    case 'function':
      if (a.toString() !== b.toString()) {
        return false;
      }

      break;

    case 'object':
      if (Object.keys(a).length !== Object.keys(b).length) {
        return false;
      }

      for (var k in a) {
        if (!isEquals(a[k], b[k])) {
          return false;
        }
      }

      break;

    default:
      if (a !== b) {
        return false;
      }

  }

  return true;
}; // logging utility


exports.isEquals = isEquals;

var log = function log(msg) {
  return console.log("[monogfb] ".concat(msg));
}; // stringify json params


exports.log = log;

var jsonify = function jsonify(q) {
  var o = {};

  var _arr = Object.keys(q);

  for (var _i = 0; _i < _arr.length; _i++) {
    var k = _arr[_i];
    var v = q[k];

    if (v) {
      o[k] = JSON.stringify(v);
    }
  }

  return o;
}; // prepare query parameters for a find


exports.jsonify = jsonify;

var prepareFind = function prepareFind() {
  var fields;
  var next;
  var options;
  var special;

  for (var _len = arguments.length, _args = new Array(_len), _key = 0; _key < _len; _key++) {
    _args[_key] = arguments[_key];
  }

  var args = _args.filter(function (arg) {
    return arg != null;
  }); // callback


  var hasCallback = typeof args[args.length - 1] === 'function';

  if (hasCallback) {
    next = args[args.length - 1];
  } // defaults


  var criteria = {}; // query objects

  if ((0, _typeof2.default)(args[0]) === 'object') {
    var _args2 = (0, _slicedToArray2.default)(args, 1);

    criteria = _args2[0];
  }

  if ((0, _typeof2.default)(args[1]) === 'object') {
    var _args3 = (0, _slicedToArray2.default)(args, 2);

    fields = _args3[1];
  }

  if ((0, _typeof2.default)(args[2]) === 'object') {
    var _args4 = (0, _slicedToArray2.default)(args, 3);

    options = _args4[2];
  }

  if ((0, _typeof2.default)(args[3]) === 'object') {
    var _args5 = (0, _slicedToArray2.default)(args, 4);

    special = _args5[3];
  } // args[1] can be either fields or options or special
  // args[2] can be either options or special
  // case: special was in args[2]


  if (options && !special && (options.token || options._)) {
    var _ref = [options, null];
    special = _ref[0];
    options = _ref[1];
  } // case: options was in args[1]


  if (fields && !options && (fields.limit || fields.skip || fields.sort)) {
    var _ref2 = [fields, null];
    options = _ref2[0];
    fields = _ref2[1];
  } // case: special was in args[1]


  if (fields && !special && (fields.token || fields._)) {
    var _ref3 = [fields, null];
    special = _ref3[0];
    fields = _ref3[1];
  } // format query objects and prepare to send


  var query = {
    criteria: criteria,
    fields: fields,
    options: options
  };
  var params = jsonify(query);

  if (special != null ? special.token : undefined) {
    params.token = special.token;
  }

  if (special != null ? special._ : undefined) {
    params._ = special._;
  }

  return [query, params, next];
};

exports.prepareFind = prepareFind;

var startsWith = function startsWith(str, target) {
  return str.slice(0, target.length) === target;
};

exports.startsWith = startsWith;
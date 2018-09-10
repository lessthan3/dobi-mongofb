"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _axios = _interopRequireDefault(require("axios"));

var _default =
/*#__PURE__*/
function () {
  var _ref = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee(options) {
    var _options$params, _params, cache, json, url, params, _ref2, data;

    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _options$params = options.params, _params = _options$params === void 0 ? {} : _options$params;
            cache = options.cache, json = options.json, url = options.url;
            params = _params;

            if (!cache) {
              if (params._ == null) {
                params._ = Date.now();
              }
            }

            _context.next = 6;
            return (0, _axios.default)({
              method: 'get',
              params: params,
              responseType: json ? 'json' : 'text',
              url: url
            });

          case 6:
            _ref2 = _context.sent;
            data = _ref2.data;

            if (data) {
              _context.next = 10;
              break;
            }

            throw new Error('missing data');

          case 10:
            return _context.abrupt("return", data);

          case 11:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.default = _default;
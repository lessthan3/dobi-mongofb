"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _firebase = _interopRequireDefault(require("firebase"));

var _Collection = _interopRequireDefault(require("./Collection"));

var _fetch = _interopRequireDefault(require("./fetch"));

var Database =
/*#__PURE__*/
function () {
  function Database(cfg) {
    var _this = this;

    (0, _classCallCheck2.default)(this, Database);
    this.cache = true;
    this.safe_writes = true;

    if (typeof cfg === 'string') {
      this.api = cfg;
      this.request('Firebase', false, function (url) {
        _this.firebase = new _firebase.default(url);
      });
    } else {
      this.api = cfg.server;
      this.firebase = new _firebase.default(cfg.firebase);
    }
  }

  (0, _createClass2.default)(Database, [{
    key: "collection",
    value: function collection(name) {
      return new _Collection.default(this, name);
    }
  }, {
    key: "get",
    value: function get(_path) {
      var path = _path.split(/[/.]/g);

      var collection = this.collection(path[0]);

      if (path.length === 1) {
        return collection;
      }

      return collection.get(path.slice(1).join('/'));
    }
  }, {
    key: "request",
    value: function request() {
      var json = true;
      var resource = '';

      var next = function next() {};

      var params = {};

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      for (var _i = 0; _i < args.length; _i++) {
        var arg = args[_i];

        switch ((0, _typeof2.default)(arg)) {
          case 'boolean':
            json = arg;
            break;

          case 'string':
            resource = arg;
            break;

          case 'function':
            next = arg;
            break;

          case 'object':
            params = arg;
            break;

          default:
            break;
        }
      }

      var url = "".concat(this.api, "/").concat(resource);

      if (this.token) {
        params.token = this.token;
      }

      return (0, _fetch.default)({
        cache: this.cache,
        json: json,
        params: params,
        resource: resource,
        url: url
      }).then(function (data) {
        return next(null, data);
      }).catch(function (err) {
        return next(err);
      });
    }
  }, {
    key: "auth",
    value: function auth(token, next) {
      var _this2 = this;

      return this.firebase.authWithCustomToken(token, function () {
        _this2.token = token;
        return next();
      });
    }
  }, {
    key: "setToken",
    value: function setToken(token) {
      this.token = token;
    }
  }]);
  return Database;
}();

exports.default = Database;
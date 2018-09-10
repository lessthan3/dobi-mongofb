"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _DocumentRef = _interopRequireDefault(require("./DocumentRef"));

var _utils = require("./utils");

var Document =
/*#__PURE__*/
function () {
  function Document(collection, data, query) {
    (0, _classCallCheck2.default)(this, Document);
    this.collection = collection;
    this.data = data;
    this.query = query;
    this.database = this.collection.database;
    this.key = "".concat(this.collection.name, "/").concat(this.data._id);

    if (this.query == null) {
      this.query = {
        criteria: null,
        fields: null,
        options: null
      };
    }

    this.ref = new _DocumentRef.default(this);
  }

  (0, _createClass2.default)(Document, [{
    key: "emit",
    value: function emit(event) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return this.ref.emit(event, args);
    }
  }, {
    key: "get",
    value: function get(path) {
      return this.ref.get(path);
    }
  }, {
    key: "name",
    value: function name() {
      return this.ref.name();
    }
  }, {
    key: "on",
    value: function on(event, handler) {
      return this.ref.on(event, handler);
    }
  }, {
    key: "off",
    value: function off(event, handler) {
      return this.ref.off(event, handler);
    }
  }, {
    key: "refresh",
    value: function refresh(next) {
      return this.ref.refresh(next);
    }
  }, {
    key: "remove",
    value: function remove(next) {
      if (!['function', 'undefined'].includes((0, _typeof2.default)(next))) {
        return (0, _utils.log)('invalid callback function to remove');
      }

      return this.collection.removeById(this.data._id, next);
    }
  }, {
    key: "save",
    value: function save(next) {
      return this.ref.set(this.data, next);
    }
  }, {
    key: "set",
    value: function set(value) {
      var next = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      return this.ref.set(value, next);
    }
  }, {
    key: "val",
    value: function val() {
      return this.ref.val();
    }
  }]);
  return Document;
}();

exports.default = Document;
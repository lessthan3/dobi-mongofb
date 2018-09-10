"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _Collection2 = _interopRequireDefault(require("./Collection"));

var _utils = require("./utils");

var PseudoCollection =
/*#__PURE__*/
function (_Collection) {
  (0, _inherits2.default)(PseudoCollection, _Collection);

  function PseudoCollection(database, name, defaults) {
    var _this;

    (0, _classCallCheck2.default)(this, PseudoCollection);
    _this = (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(PseudoCollection).call(this, database, name));
    _this.database = database;
    _this.name = name;
    _this.defaults = defaults == null ? {} : defaults;
    return _this;
  }

  (0, _createClass2.default)(PseudoCollection, [{
    key: "insert",
    value: function insert(_doc, priority, next) {
      var doc = _doc;

      var _arr = Object.keys(this.defaults);

      for (var _i = 0; _i < _arr.length; _i++) {
        var k = _arr[_i];
        var v = this.defaults[k];
        doc[k] = v;
      }

      return (0, _get2.default)((0, _getPrototypeOf2.default)(PseudoCollection.prototype), "insert", this).call(this, doc, priority, next);
    }
  }, {
    key: "find",
    value: function find() {
      var criteria = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _next = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var _prepareFind = (0, _utils.prepareFind)(criteria, fields, options, _next),
          _prepareFind2 = (0, _slicedToArray2.default)(_prepareFind, 3),
          query = _prepareFind2[0],
          next = _prepareFind2[2];

      var _arr2 = Object.keys(this.defaults);

      for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
        var k = _arr2[_i2];
        var v = this.defaults[k];
        query.criteria[k] = v;
      }

      return (0, _get2.default)((0, _getPrototypeOf2.default)(PseudoCollection.prototype), "find", this).call(this, query.criteria, query.fields, query.options, next);
    }
  }, {
    key: "findOne",
    value: function findOne() {
      var criteria = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _next = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var _prepareFind3 = (0, _utils.prepareFind)(criteria, fields, options, _next),
          _prepareFind4 = (0, _slicedToArray2.default)(_prepareFind3, 3),
          query = _prepareFind4[0],
          next = _prepareFind4[2];

      var _arr3 = Object.keys(this.defaults);

      for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
        var k = _arr3[_i3];
        var v = this.defaults[k];
        query.criteria[k] = v;
      }

      return (0, _get2.default)((0, _getPrototypeOf2.default)(PseudoCollection.prototype), "findOne", this).call(this, query.criteria, query.fields, query.options, next);
    }
  }]);
  return PseudoCollection;
}(_Collection2.default);

exports.default = PseudoCollection;
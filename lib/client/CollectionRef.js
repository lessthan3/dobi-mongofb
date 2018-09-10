"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _EventEmitter2 = _interopRequireDefault(require("./EventEmitter"));

var CollectionRef =
/*#__PURE__*/
function (_EventEmitter) {
  (0, _inherits2.default)(CollectionRef, _EventEmitter);

  function CollectionRef(collection) {
    var _this;

    (0, _classCallCheck2.default)(this, CollectionRef);
    _this = (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(CollectionRef).call(this));
    _this.collection = collection;
    _this.database = _this.collection.database;
    _this.ref = _this.database.firebase.child(_this.collection.name);
    return _this;
  }

  (0, _createClass2.default)(CollectionRef, [{
    key: "endAt",
    value: function endAt(priority) {
      this.ref = this.ref.endAt(priority);
    }
  }, {
    key: "limit",
    value: function limit(num) {
      this.ref = this.ref.limit(num);
    }
  }, {
    key: "startAt",
    value: function startAt(priority) {
      this.ref = this.ref.startAt(priority);
    }
  }, {
    key: "on",
    value: function on(event, handler) {
      var _this2 = this;

      (0, _get2.default)((0, _getPrototypeOf2.default)(CollectionRef.prototype), "on", this).call(this, event, handler);

      if ((this.events.insert != null ? this.events.insert.length : undefined) > 0) {
        this.ref.off('child_added');
        this.ref.on('child_added', function (snapshot) {
          return _this2.emit('insert', snapshot.val());
        });
      }

      if ((this.events.remove != null ? this.events.remove.length : undefined) > 0) {
        this.ref.off('child_removed');
        this.ref.on('child_removed', function (snapshot) {
          return _this2.emit('remove', snapshot.val());
        });
      }
    }
  }, {
    key: "off",
    value: function off(event) {
      var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      (0, _get2.default)((0, _getPrototypeOf2.default)(CollectionRef.prototype), "off", this).call(this, event, handler);

      if ((this.events.insert != null ? this.events.insert.length : undefined) === 0) {
        this.ref.off('child_added');
      }

      if ((this.events.remove != null ? this.events.remove.length : undefined) === 0) {
        this.ref.off('child_removed');
      }
    }
  }]);
  return CollectionRef;
}(_EventEmitter2.default);

var _default = CollectionRef;
exports.default = _default;
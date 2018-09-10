"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var EventEmitter =
/*#__PURE__*/
function () {
  function EventEmitter() {
    (0, _classCallCheck2.default)(this, EventEmitter);
    this.events = {};
  }

  (0, _createClass2.default)(EventEmitter, [{
    key: "emit",
    value: function emit(event) {
      if (this.events[event]) {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.events[event][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var handler = _step.value;
            handler.apply(void 0, (0, _toConsumableArray2.default)(args || []));
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    }
  }, {
    key: "on",
    value: function on(event, handler) {
      if (this.events[event] == null) {
        this.events[event] = [];
      }

      this.events[event].push(handler);
    } // handler=null will remove all events of that type

  }, {
    key: "off",
    value: function off(event) {
      var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      if (this.events[event] == null) {
        this.events[event] = [];
      }

      this.events[event] = this.events[event].filter(function (fn) {
        return handler !== null && fn !== handler;
      });
    }
  }]);
  return EventEmitter;
}();

exports.default = EventEmitter;
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _EventEmitter2 = _interopRequireDefault(require("./EventEmitter"));

var _utils = require("./utils");

var DocumentRef =
/*#__PURE__*/
function (_EventEmitter) {
  (0, _inherits2.default)(DocumentRef, _EventEmitter);

  function DocumentRef(document, path) {
    var _this;

    (0, _classCallCheck2.default)(this, DocumentRef);
    _this = (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(DocumentRef).call(this));
    _this.document = document;
    _this.path = path == null ? '' : path;
    _this.counter = ++DocumentRef._counter;
    _this.collection = _this.document.collection;
    _this.database = _this.collection.database; // @path[0] doesn't work in ie6, must use @path[0..0]

    if (typeof _this.path === 'string') {
      if (_this.path.slice(0, 1) === '/') {
        _this.path = _this.path.slice(1);
      }

      if (typeof _this.path === 'string') {
        _this.path = _this.path.split(/[/.]/g);
      }
    }

    _this.key = "".concat(_this.document.key, "/").concat(_this.path.join('/')).replace(/\/$/, '');
    _this.data = _this.document.data;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _this.path[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var k = _step.value;

        if (k !== '') {
          _this.data = _this.data != null ? _this.data[k] : undefined;
        }
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

    if (_this.data == null) {
      _this.data = null;
    }

    _this.ref = _this.database.firebase.child(_this.key);
    return _this;
  }

  (0, _createClass2.default)(DocumentRef, [{
    key: "log",
    value: function log() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      // eslint-disable-next-line no-console
      return console.log("ref_".concat(this.counter), args);
    }
  }, {
    key: "get",
    value: function get(_path) {
      var path = _path;
      var temp = this.path.slice(0);

      while ((0, _utils.startsWith)(path, '..')) {
        temp.pop();
        path = path.slice(2);

        if ((0, _utils.startsWith)(path, '/')) {
          path = path.slice(1);
        }
      }

      return new DocumentRef(this.document, "".concat(temp.join('/'), "/").concat(path));
    }
  }, {
    key: "name",
    value: function name() {
      if (this.path.length === 1 && this.path[0] === '') {
        return this.data._id;
      }

      return this.path[this.path.length - 1];
    } // value: emit now and when updated
    // update: emit only when updated

  }, {
    key: "on",
    value: function on(event, handler) {
      var _this2 = this;

      (0, _get2.default)((0, _getPrototypeOf2.default)(DocumentRef.prototype), "on", this).call(this, event, handler);

      if ((this.events.update != null ? this.events.update.length : undefined) > 0 || (this.events.value != null ? this.events.value.length : undefined) > 0) {
        this.emit('value', this.val());
        this.ref.on('value', function (snapshot) {
          return _this2.updateData(snapshot.val());
        });
      }
    }
  }, {
    key: "off",
    value: function off(event) {
      var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      (0, _get2.default)((0, _getPrototypeOf2.default)(DocumentRef.prototype), "off", this).call(this, event, handler);

      if (!(this.events.update != null ? this.events.update.length : undefined) || !(this.events.value != null ? this.events.value.length : undefined)) {
        this.ref.off('value');
      }
    }
  }, {
    key: "parent",
    value: function parent() {
      return new DocumentRef(this.document, this.path.slice(0, this.path.length - 1));
    }
  }, {
    key: "refresh",
    value: function refresh(next) {
      var _this3 = this;

      var completed = false;

      var done = function done() {
        if (!completed) {
          if (typeof next === 'function') {
            next();
          }
        }

        completed = true;
      };

      return this.ref.once('value', function (snapshot) {
        return _this3.updateData(snapshot.val(), function () {
          return done();
        });
      });
    }
  }, {
    key: "remove",
    value: function remove(next) {
      if (!['function', 'undefined'].includes((0, _typeof2.default)(next))) {
        return (0, _utils.log)('invalid callback function to remove');
      }

      return this.set(null, next);
    }
  }, {
    key: "set",
    value: function set(value, next) {
      var _this4 = this;

      // if specific fields were queried for, only allow those to be updated
      if (this.database.safe_writes) {
        var allow = true;

        if (this.document.query.fields) {
          allow = false;

          for (var k in this.document.query.fields) {
            if (k) {
              var dst = "".concat(this.document.key, "/").concat(k.replace(/\./g, '/'));
              allow = allow || this.key.indexOf(dst) === 0;
            }
          }
        }

        if (!allow) {
          return typeof next === 'function' ? next('cannot set a field that was not queried for') : undefined;
        }
      }

      var ref = this.database.firebase.child(this.key);
      return ref.set(value, function (err) {
        if (err) {
          return typeof next === 'function' ? next(err) : undefined;
        }

        return _this4.database.request("sync/".concat(_this4.key), function (syncErr) {
          if (syncErr) {
            return typeof next === 'function' ? next(syncErr) : undefined;
          }

          return _this4.updateData(value, function () {
            return typeof next === 'function' ? next(null) : undefined;
          });
        });
      });
    } // @data = what we got from mongodb or what was already updated here
    // data = new data from firebase

  }, {
    key: "updateData",
    value: function updateData(_data, next) {
      var _this5 = this;

      var data = _data; // ignore special 'created' and 'last_modified' fields on documents

      if (this.key === this.document.key) {
        if (this.data != null ? this.data.created : undefined) {
          data.created = this.data.created;
        }

        if (this.data != null ? this.data.last_modified : undefined) {
          data.last_modified = this.data.last_modified;
        }
      } // no updates to send if data isn't changing


      if ((0, _utils.isEquals)(this.data, data)) {
        return typeof next === 'function' ? next() : undefined;
      } // here, we need to set a brief timeout so all firebase listeners can
      // fire before we update any data. if we ran this code synchonously
      // a DocumentRef may update the Document data before the Document
      // listener had a chance to update. In that case, the isEquals call a few
      // lines above would return true, and the listener for the Document would
      // never be fired. With this setTimeout, all listeners have a chance to
      // compare against past data before anything is updated.
      //
      // example
      // ```
      //   cookie = db.cookies.findOne()
      //   type = cookie.get 'type'
      //   cookie.on 'update', (val) ->
      //     console.log 'cookie was updated'
      //   type.on 'update', (val) ->
      //     console.log 'type was updated'
      //   type.set 'new type'
      // ```
      //
      // this works because setTimeout() re-queues the new javascript at the end
      // of the execution queue.


      return setTimeout(function () {
        // update DocumentRef data
        _this5.data = data; // update document data. this will allow handlers to use
        // ref.get and have access to new data

        if (_this5.path.length === 1 && _this5.path[0] === '') {
          _this5.document.data = data;
        } else {
          var adjustedLength = Math.max(_this5.path.length, 1);

          var keys = _this5.path.slice(0, adjustedLength - 1);

          var key = _this5.path[adjustedLength - 1];
          var target = _this5.document.data;
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var k = _step2.value;

              if (target[k] == null) {
                target[k] = {};
              }

              target = target[k];
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }

          target[key] = data;
        } // emit the updates


        _this5.emit('update', _this5.val());

        _this5.emit('value', _this5.val());

        return typeof next === 'function' ? next() : undefined;
      }, 1);
    }
  }, {
    key: "val",
    value: function val() {
      if (this.data === null) {
        return null;
      }

      if (Array.isArray(this.data)) {
        return (0, _toConsumableArray2.default)(this.data);
      }

      if ((0, _typeof2.default)(this.data) === 'object') {
        return (0, _objectSpread2.default)({}, this.data);
      }

      return this.data;
    }
  }]);
  return DocumentRef;
}(_EventEmitter2.default);

DocumentRef._counter = 0;
var _default = DocumentRef;
exports.default = _default;
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _CollectionRef = _interopRequireDefault(require("./CollectionRef"));

var _Document = _interopRequireDefault(require("./Document"));

var _utils = require("./utils");

var Collection =
/*#__PURE__*/
function () {
  function Collection(database, name) {
    (0, _classCallCheck2.default)(this, Collection);
    this.database = database;
    this.name = name;
    this.ref = new _CollectionRef.default(this);
  }

  (0, _createClass2.default)(Collection, [{
    key: "insert",
    value: function insert(_doc, _priority, _next) {
      var _this = this;

      var doc = _doc;
      var next = _next;
      var priority = _priority;

      if (typeof priority === 'function') {
        var _ref = [priority, null];
        next = _ref[0];
        priority = _ref[1];
      }

      if (typeof next !== 'function') {
        next = function next() {};
      }

      return this.database.request('ObjectID', false, {
        _: "".concat(Date.now(), "-").concat(Math.random())
      }, function (requestErr, id) {
        if (requestErr) {
          return next(requestErr);
        }

        doc._id = id;

        var ref = _this.database.firebase.child("".concat(_this.name, "/").concat(id));

        return ref.set(doc, function (setErr) {
          if (setErr) {
            return next(setErr);
          }

          if (priority) {
            ref.setPriority(priority);
          }

          return _this.database.request("sync/".concat(_this.name, "/").concat(id), {
            _: Date.now()
          }, function (err, data) {
            if (err) {
              return next(err);
            }

            return next(null, new _Document.default(_this, data));
          });
        });
      });
    } // find()
    // find(criteria)
    // find(criteria, fields)
    // find(criteria, options)
    // find(criteria, fields, options)
    //
    // find(next)
    // find(criteria, next)
    // find(criteria, fields, next)
    // find(criteria, options, next)
    // find(criteria, fields, options, next)

  }, {
    key: "find",
    value: function find() {
      var _this2 = this;

      var criteria = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _next = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var _prepareFind = (0, _utils.prepareFind)(criteria, fields, options, _next),
          _prepareFind2 = (0, _slicedToArray2.default)(_prepareFind, 3),
          query = _prepareFind2[0],
          params = _prepareFind2[1],
          next = _prepareFind2[2];

      if (next) {
        return this.database.request("".concat(this.name, "/find"), params, function (err, datas) {
          if (err) {
            return next(err);
          }

          var output = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = datas[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var data = _step.value;
              output.push(new _Document.default(_this2, data, query));
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

          return next(null, output);
        });
      }

      var datas = this.database.request("".concat(this.name, "/find"), params) || [];
      var result = [];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = datas[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var data = _step2.value;
          result.push(new _Document.default(this, data, query));
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

      return result;
    }
  }, {
    key: "findById",
    value: function findById() {
      var _this3 = this;

      var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _next = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var _prepareFind3 = (0, _utils.prepareFind)(id, fields, options, _next),
          _prepareFind4 = (0, _slicedToArray2.default)(_prepareFind3, 3),
          params = _prepareFind4[1],
          next = _prepareFind4[2];

      if (next) {
        return this.database.request("".concat(this.name, "/").concat(id), params, function (err, data) {
          if (err) {
            return next(err);
          }

          if (!data) {
            return next(null, null);
          }

          return next(null, new _Document.default(_this3, data));
        });
      }

      var data = this.database.request("".concat(this.name, "/").concat(id), params);

      if (!data) {
        return null;
      }

      return new _Document.default(this, data);
    } // findOne()
    // findOne(criteria)
    // findOne(criteria, fields)
    // findOne(criteria, fields, options)
    //
    // findOne(next)
    // findOne(criteria, next)
    // findOne(criteria, fields, next)
    // findOne(criteria, fields, options, next)

  }, {
    key: "findOne",
    value: function findOne() {
      var _this4 = this;

      var criteria = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _next = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var _prepareFind5 = (0, _utils.prepareFind)(criteria, fields, options, _next),
          _prepareFind6 = (0, _slicedToArray2.default)(_prepareFind5, 3),
          query = _prepareFind6[0],
          params = _prepareFind6[1],
          next = _prepareFind6[2];

      if (next) {
        return this.database.request("".concat(this.name, "/findOne"), params, function (err, data) {
          if (err) {
            return next(err);
          }

          if (!data) {
            return next(null, null);
          }

          return next(null, new _Document.default(_this4, data, query));
        });
      }

      var data = this.database.request("".concat(this.name, "/findOne"), params);

      if (!data) {
        return null;
      }

      return new _Document.default(this, data, query);
    }
  }, {
    key: "list",
    value: function list(priority, _limit) {
      var limit = _limit == null ? 1 : _limit;
      this.ref.endAt(priority);
      this.ref.limit(limit);
      return this.ref;
    }
  }, {
    key: "removeById",
    value: function removeById(_id, _next) {
      var _this5 = this;

      var next = _next;

      if (typeof next !== 'function') {
        next = function next() {};
      }

      var ref = this.database.firebase.child("".concat(this.name, "/").concat(_id)); // store current value

      return ref.once('value', function (snapshot) {
        var oldData = snapshot.val(); // remove value from firebase

        return ref.set(null, function (refSetErr) {
          if (refSetErr) {
            return next(refSetErr);
          } // sync result to mongodb


          return _this5.database.request("sync/".concat(_this5.name, "/").concat(_id), function (syncErr) {
            // if sync failed, rollback data
            if (syncErr) {
              return ref.set(oldData, function (err) {
                if (err) {
                  return next('sync failed, and rollback failed');
                }

                return next('sync failed, data rollback successful');
              }); // sync successful
            }

            return typeof next === 'function' ? next(null) : undefined;
          });
        });
      });
    }
  }]);
  return Collection;
}();

var _default = Collection;
exports.default = _default;
(function() {
  var collection, _i, _len, _ref;

  window.db = new mongofb.Database({
    server: '/api/v1',
    firebase: 'https://testproject-24602.firebaseio.com'
  });

  _ref = ['users', 'objects', 'sites'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    collection = _ref[_i];
    window.app[collection] = window.db.get(collection);
  }

}).call(this);

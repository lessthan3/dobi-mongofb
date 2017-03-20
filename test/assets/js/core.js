(function() {
  var collection, i, len, ref;

  window.db = new mongofb.Database({
    server: '/api/v1',
    firebase: 'https://testproject-24602.firebaseio.com'
  });

  ref = ['users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = window.db.get(collection);
  }

}).call(this);

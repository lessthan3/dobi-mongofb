(function() {
  var collection, db, i, len, ref;

  db = new mongofb.Database({
    server: '/api/v1',
    firebase: 'https://crackling-torch-8221.firebaseio.com'
  });

  window.app = {};

  ref = ['users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = db.collection(collection);
  }

}).call(this);

(function () {
  // setup mongoFB database
  let collection; let i; let len; let
    ref;

  window.db = new mongofb.Database({
    server: '/api/v1',
    firebase: 'https://shining-fire-369.firebaseio.com',
  });

  window.app = {};

  ref = ['blacklist', 'users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = window.db.get(collection);
  }
}).call(this);

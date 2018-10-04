(function () {
  // setup mongoFB database
  let collection; let i; let len; let
    ref;

  window.db = new mongofb.Database({
    api: '/api/v1',
    cache: {
      enabled: false,
    },
    firebase: {
      apiKey: 'AIzaSyBZ7RgxzO3v_GTPD58nC_xjs2n3jfexH0w',
      databaseURL: 'https://maestro-db-staging.firebaseio.com',
    },
  });

  window.app = {};

  ref = ['blacklist', 'users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = window.db.get(collection);
  }
}).call(this);

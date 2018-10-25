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
      apiKey: 'AIzaSyD6OhCRWmpfwPmgSlNz1uZK4lhrLBFpFLs',
      databaseURL: 'https://lessthan3.firebaseio.com',
    },
  });

  window.app = {};

  ref = ['blacklist', 'users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = window.db.get(collection);
  }
  for (const collection of ['pages']) {
    window.app[collection] = new mongofb.PseudoCollection(db, 'objects', {
      site_id: '5a4ed7f9d368452034bec957',
      collection,
    });
  }
}).call(this);

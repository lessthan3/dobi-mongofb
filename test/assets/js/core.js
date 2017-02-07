(function() {
  var collection, db, i, len, ref, url, urls;

  urls = ['maestro-tweets', 'lt3-forum'];

  url = urls[Math.floor(Math.random() * urls.length)];

  $('body').append("<span>" + url + "</span>");

  db = new mongofb.Database({
    server: '/api/v1',
    shard: url
  });

  window.app = {};

  ref = ['users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = db.collection(collection);
  }

}).call(this);

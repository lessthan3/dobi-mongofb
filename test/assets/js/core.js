(function() {
  var collection, db, i, len, ref, shard, shards;

  shards = ['maestro-tweets', 'lt3-forum'];

  shard = shards[Math.floor(Math.random() * shards.length)];

  $('body').append("<span>" + shard + "</span>");

  db = new mongofb.Database({
    server: '/api/v1',
    firebase: "https://" + shard + ".firebaseio.com"
  });

  window.app = {};

  ref = ['users', 'objects', 'sites'];
  for (i = 0, len = ref.length; i < len; i++) {
    collection = ref[i];
    window.app[collection] = db.collection(collection);
  }

}).call(this);

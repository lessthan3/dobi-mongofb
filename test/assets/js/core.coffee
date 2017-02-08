# setup mongoFB database
shards = [
  'maestro-tweets'
  'lt3-forum'
]
shard = shards[Math.floor Math.random() * shards.length]
$('body').append "<span>#{shard}</span>"
db = new mongofb.Database {
  server: '/api/v1'
  firebase: "https://#{shard}.firebaseio.com"
}

window.app = {}
for collection in ['users', 'objects', 'sites']
  window.app[collection] = db.collection collection

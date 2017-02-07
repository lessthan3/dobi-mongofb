# setup mongoFB database
urls = [
  'maestro-tweets'
  'lt3-forum'
]
url = urls[Math.floor Math.random() * urls.length]
$('body').append "<span>#{url}</span>"
db = new mongofb.Database {
  server: '/api/v1'
  shard: url

}

window.app = {}
for collection in ['users', 'objects', 'sites']
  window.app[collection] = db.collection collection

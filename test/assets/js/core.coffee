# setup mongoFB database
db = new mongofb.Database {
  server: '/api/v1'
  firebase: 'https://crackling-torch-8221.firebaseio.com'
}

window.app = {}
for collection in ['users', 'objects', 'sites']
  window.app[collection] = db.collection collection

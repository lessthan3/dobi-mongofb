# setup mongoFB database
window.db = new mongofb.Database {
  server: '/api/v1'
  firebase: 'https://shining-fire-369.firebaseio.com'
}

window.app = {}

for collection in ['users', 'objects', 'sites']
  window.app[collection] = window.db.get collection

# setup mongoFB database
window.db = new mongofb.Database {
  server: '/api/v1'
  firebase: 'https://testproject-24602.firebaseio.com'
}

for collection in ['users', 'objects', 'sites']
  window.app[collection] = window.db.get collection

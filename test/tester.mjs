import admin from 'firebase-admin';
import firebase from 'firebase';
import * as env from 'strict-env';
import AdminTokenGenerator from './helpers/adminTokenGenerator';
import auth from './helpers/auth';

const CREDENTIAL = env.get('CREDENTIAL', env.json);
const API_KEY = env.get('API_KEY', env.string);
const DATABASE_URL = env.get('DATABASE_URL', env.string);

console.log(CREDENTIAL);

const run = async () => {
  const adminTokenGenerator = new AdminTokenGenerator(CREDENTIAL);

  const adminToken = await adminTokenGenerator.get();
  console.log(adminToken);

  admin.initializeApp({
    credential: admin.credential.cert(CREDENTIAL),
    databaseURL: DATABASE_URL,
  });

  // initialiaze app
  firebase.initializeApp({
    apiKey: API_KEY,
    databaseURL: DATABASE_URL,
    // bucket: 'shining-fire-369.appspot.com',
  });

  const code = await admin.auth().createCustomToken('123123', {
    admin: true,
    user: {
      uid: 'testUid',
      service: 'testService',
    },
  });

  return console.log(code);

  await firebase.auth().signInWithCustomToken(code);
  const token = await firebase.auth().currentUser.getIdToken();

  const req = {
    fbAdmin: admin,
    query: { token },
  };
  await auth(req, {});
};

run().catch((err) => { throw new Error(err); });

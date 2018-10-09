/* eslint-disable no-console */

import admin from 'firebase-admin';
import firebase from 'firebase';
import * as env from 'strict-env';
// import AdminTokenGenerator from '../src/server/helpers/adminTokenGenerator';
// import auth from '../src/server/helpers/authGenerator';

const CREDENTIAL = env.get('CREDENTIAL', env.json);
const API_KEY = env.get('API_KEY', env.string);
const DATABASE_URL = env.get('DATABASE_URL', env.string);
// const CUSTOM_TOKEN = env.get('CUSTOM_TOKEN', env.string);

const run = async () => {
  // const adminTokenGenerator = new AdminTokenGenerator(CREDENTIAL);

  // const adminToken = await adminTokenGenerator.get();
  // console.log(adminToken);

  console.log(CREDENTIAL);

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
    user: {
      service: 'email',
      uid: 'email-steve@maestro.io',
    },
  });

  return console.log(code);

  // await firebase.auth().signInWithCustomToken(CUSTOM_TOKEN);
  // const token = await firebase.auth().currentUser.getIdToken();
  // const refreshToken = firebase.auth().currentUser.refreshToken;
  // // const tokenResult = await firebase.auth().currentUser.getIdTokenResult();
  //
  // // const req = {
  // //   fbAdmin: admin,
  // //   query: { token },
  // // };
  // // await auth(req, {});
  // // console.log(new Date(tokenResult.expirationTime).getTime());
  // console.log(refreshToken);
  // console.log(req);
};

run().catch((err) => { throw new Error(err); });

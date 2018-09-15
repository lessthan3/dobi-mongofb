import mongodb from 'mongodb';
import Firebase from 'firebase';
import FirebaseTokenGenerator from 'firebase-token-generator';
import util from 'util';

const { promisify } = util;

let fb = null;
let db = null;

export default async (cfg) => {
  if (db && fb) {
    return { db, fb };
  }
  const {
    db: database,
    host,
    options,
    pass,
    port,
    user,
  } = cfg.mongodb;
  const url = `mongodb://${user}:${pass}@${host}:${port}/${database}`.replace(':@', '@');
  const mongoClient = await mongodb.MongoClient.connect(url, options);

  db = mongoClient.db(database);
  db.ObjectID = mongodb.ObjectID;
  fb = new Firebase(cfg.firebase.url);
  const asyncAuth = promisify(fb.authWithCustomToken);
  if (cfg.firebase.secret) {
    const tokenGenerator = new FirebaseTokenGenerator(cfg.firebase.secret);
    const token = tokenGenerator.createToken({}, {
      admin: true,
      expires: Date.now() + (1000 * 60 * 60 * 24 * 30),
    });
    await asyncAuth.apply(fb, [token]);

    fb.admin_token = token;
    return { db, fb };
  }
  return { db, fb };
};

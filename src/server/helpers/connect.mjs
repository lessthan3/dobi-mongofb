import mongodb from 'mongodb';
import Firebase from 'firebase';
import FirebaseTokenGenerator from 'firebase-token-generator';
import util from 'util';

const { promisify } = util;

let fb = null;
let db = null;

const defaultMongoConfig = {
  db: 'test',
  host: 'localhost',
  options: {
    autoReconnect: true,
    keepAlive: 120,
    native_parser: false,
    poolSize: 1,
    useNewUrlParser: true,
  },
  pass: 'testPassword',
  port: 27017,
  user: 'testUser',
};

export default async ({
  mongodb: mongoDbConfig = {},
  firebase: {
    secret: firebaseSecret,
    url: firebaseUrl,
  } = {},
}) => {
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
  } = {
    ...defaultMongoConfig,
    ...mongoDbConfig,
    options: {
      ...defaultMongoConfig.options,
      ...mongoDbConfig.options,
    },
  };

  const url = `mongodb://${user}:${pass}@${host}:${port}/${database}`.replace(':@', '@');
  const mongoClient = await mongodb.MongoClient.connect(url, options);

  db = mongoClient.db(database);
  db.ObjectID = mongodb.ObjectID;
  fb = new Firebase(firebaseUrl);
  const asyncAuth = promisify(fb.authWithCustomToken);
  if (firebaseSecret) {
    const tokenGenerator = new FirebaseTokenGenerator(firebaseSecret);
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

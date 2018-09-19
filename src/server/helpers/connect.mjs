import mongodb from 'mongodb';
import admin from 'firebase-admin';
import assert from 'assert';

let fbAdmin = null;
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

const connectMongo = async (mongoDbConfig = {}) => {
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
  return mongoClient.db(database);
};

export default async ({
  mongodb: mongoDbConfig = {},
  firebase: {
    credential,
    databaseURL,
  } = {},
}) => {
  if (db && fbAdmin) {
    return { db, fbAdmin };
  }
  assert(credential, 'firebase credential required in config');

  db = await connectMongo(mongoDbConfig);
  db.ObjectID = mongodb.ObjectID;

  admin.initializeApp({
    credential: admin.credential.cert(credential),
    databaseURL,
  });
  fbAdmin = admin.database();

  return { db, fbAdmin };
};

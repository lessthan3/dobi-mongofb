import mongodb from 'mongodb';
import admin from 'firebase-admin';
import isArray from 'lodash/isArray';

const { ObjectId } = mongodb;
const SHARD_REGEX = /^https?:\/\/([\w\d-_]+)\.firebaseio\.com/;

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


let fbAdminShards;
let db;
export default config => async (ctx, next) => {
  const {
    firebaseShards = [],
    hooks = {},
    mongodb: mongoDbConfig = {},
    options: {
      collections = [],
      limitDefault = 20,
      limitMax = 1000,
    } = {},
  } = config;

  ctx.assert(isArray(firebaseShards), 500, 'initState: firebaseShards is not an array');

  if (!fbAdminShards) {
    fbAdminShards = firebaseShards.reduce((obj, { credential, databaseURL }) => {
      const matches = SHARD_REGEX.exec(databaseURL);
      ctx.assert(matches, 500, `initState: cannot parse database url - ${databaseURL}`);
      const [shard] = matches;
      return {
        ...obj,
        [shard]: admin.initializeApp({
          credential: admin.credential.cert(credential),
          databaseURL,
        }, `dobi-mongofb-admin-${shard}`),
      };
    }, {});
  }

  if (!db) {
    db = await connectMongo(mongoDbConfig);
  }

  ctx.state = {
    ...ctx.state,
    db,
    fbAdminShards,
    mongoDbConfig,
    mongoFbLimitDefault: limitDefault,
    mongoFbLimitMax: limitMax,
    mongoFbCollections: collections,
    mongoFbHooks: hooks,
    ObjectId,
  };

  await next();
};

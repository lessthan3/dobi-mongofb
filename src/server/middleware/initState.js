import isArray from 'lodash/isArray';

const SHARD_REGEX = /^https?:\/\/([\w\d-_]+)\.firebaseio\.com/;

const connectMongo = async ({ mongodb, mongoDbConfig = {} }) => {
  const {
    uri
  } = mongoDbConfig;

  const mongoClient = await mongodb.MongoClient.connect(uri, {
    autoReconnect: true,
    keepAlive: 120,
    native_parser: false,
    poolSize: 10,
    useNewUrlParser: true,
  });
  return mongoClient.db();
};


let fbAdminShards;
let db;
export default ({ admin, mongodb, config }) => async (ctx, next) => {
  ctx.assert(admin, 500, 'initState: firebase-admin module not found');
  ctx.assert(mongodb, 500, 'initState: mongodb module not found');
  ctx.assert(mongodb.ObjectId, 500, 'initState: ObjectId not found in mongodb');
  const {
    firebaseShards = [],
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
      const [, shard] = matches;
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
    db = await connectMongo({ ctx, mongodb, mongoDbConfig });
  }

  ctx.state = {
    ...ctx.state,
    db,
    fbAdminShards,
    mongoDbConfig,
    mongoFbLimitDefault: limitDefault,
    mongoFbLimitMax: limitMax,
    mongoFbCollections: collections,
    ObjectId: mongodb.ObjectId,
  };

  await next();
};

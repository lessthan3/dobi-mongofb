import mongodb from 'mongodb';

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

export default async (mongoDbConfig = {}) => {
  if (!db) {
    db = await connectMongo(mongoDbConfig);
    db.ObjectID = mongodb.ObjectID;
  }
  return db;
};

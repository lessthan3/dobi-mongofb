/* eslint-disable no-console */

import Koa from 'koa';
import Router from 'koa-router';
import koaConnect from 'koa-connect';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import send from 'koa-send';
import fs from 'fs';
import morgan from 'morgan';
import * as env from 'strict-env';
import mongofb from '../src/server';
import dirname from './dirname';
import {
  canInsert,
  canRead,
  canRemove,
  canUpdate,
  postFind,
} from './mongoFbMiddleware';

const API_KEY = env.get('API_KEY', env.string);
const CREDENTIAL = env.get('CREDENTIAL', (str) => {
  const obj = JSON.parse(str);
  return {
    ...obj,
    private_key: obj.private_key.replace(/\\n/g, '\n'),
  };
});
const DATABASE_URL = env.get('DATABASE_URL', env.string);
const MONGO = env.get('MONGO_CONFIG', env.json);

const mongoFbAdmin = {
  cache: {
    max: 100,
    maxAge: 1000 * 60 * 5,
  },
  firebaseShards: [{
    apiKey: API_KEY,
    credential: CREDENTIAL,
    databaseURL: DATABASE_URL,
  }],
  middleware: {
    canInsert,
    canRead,
    canRemove,
    canUpdate,
    postFind,
  },
  mongodb: {
    db: MONGO.db,
    host: MONGO.host,
    options: {
      autoReconnect: true,
      keepAlive: 120,
      native_parser: false,
      poolSize: 1,
      useNewUrlParser: true,
    },
    pass: MONGO.pass,
    port: MONGO.port,
    user: MONGO.user,
  },
  options: {
    collections: [
      'apps',
      'entities',
      'media',
      'objects',
      'pages',
      'sites',
      'packages_config',
      'packages',
      'site_users',
      'users',
    ],
  },
  root: '/api/v1',
};

// eslint-disable-next-line no-console
const log = (...args) => console.log(args);
// eslint-disable-next-line no-console
const fail = (msg) => {
  console.log(`FATAL: ${msg}`);
  return process.exit(1);
};

// copy file over
const copyFile = (next) => {
  const read = fs.createReadStream('./dist/client.js');
  read.on('error', fail);
  const wr = fs.createWriteStream('./test/assets/js/client.js');
  wr.on('error', fail);
  wr.on('close', next);
  return read.pipe(wr);
};

copyFile(() => {
  const app = new Koa();
  const router = new Router();
  router.get('/', async (ctx) => {
    await send(ctx, ctx.path, { index: 'index.html', root: `${dirname}/views` });
  });

  const mongofbRoutes = mongofb(mongoFbAdmin);

  app.use(bodyParser());
  app.use(koaConnect(morgan('combined')));
  app.use(serve('./test/assets'));
  app.use(mongofbRoutes.routes());
  app.use(mongofbRoutes.allowedMethods());
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.listen(8080);
  return log('server running..., connect to localhost:8080');
});

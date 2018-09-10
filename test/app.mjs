import bodyParser from 'body-parser';
import config from '/u/config/test-config.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import mongofb from '../lib/server';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// helpers
const log = (...args) => console.log(args);
const fail = (msg) => {
  console.log(`FATAL: ${msg}`);
  return process.exit(1);
};

// copy file over
const copyFile = (next) => {
  const read = fs.createReadStream(`${__dirname}/../dist/client.js`);
  read.on('error', fail);
  const wr = fs.createWriteStream(`${__dirname}/assets/js/client.js`);
  wr.on('error', fail);
  wr.on('close', next);
  return read.pipe(wr);
};

copyFile(() => {
  const endpoints = {
    '/': (req, res) => res.sendFile(`${__dirname}/views/index.html`),
  };

  const middleware = [
    bodyParser.json(),
    mongofb.server({
      cache: {
        max: 100,
        maxAge: 1000 * 60 * 5,
      },
      firebase: {
        secret: config.firebase.secret,
        url: config.firebase.url,
      },
      mongodb: {
        db: 'test',
        host: 'localhost',
        options: {
          autoReconnect: true,
          keepAlive: 12,
          native_parser: false,
          poolSize: 1,
        },
        pass: 'testPassword',
        port: 27017,
        user: 'testUser',
      },
      options: {
        blacklist: [
          'blacklist',
        ],
      },
      root: '/api/v1',
    }),
  ];

  const app = express();
  app.use(express.static(`${__dirname}/assets`));
  for (const ware of middleware) {
    app.use(ware);
  }
  for (const point of Object.keys(endpoints)) {
    const action = endpoints[point];
    app.get(point, action);
  }
  app.listen(8080);
  return log('server running..., connect to localhost:8080');
});

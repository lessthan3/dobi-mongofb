import bodyParser from 'body-parser';
import config from '/u/config/test-config';
import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import mongofb from '../lib/server';
import dirname from './dirname';

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
  const endpoints = {
    '/': (req, res) => res.sendFile(`${dirname}/views/index.html`),
  };

  const middleware = [
    morgan('combined'),
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
  app.use(express.static('./test/assets'));
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

/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const async = require('async');
const bodyParser = require('body-parser');
const coffee = require('coffeescript');
const config = require('/u/config/test-config.js');
const connectAssets = require('teacup/lib/connect-assets');
const express = require('express');
const fs = require('fs');
const teacup = require('teacup/lib/express');
const mongofb = require('../lib/server.js');

// helpers
const log = (...args) => console.log(args);
const fail = (msg) => {
  console.log(`FATAL: ${msg}`);
  return process.exit(1);
};

// copy file over
const copyFile = (next) => {
  const read = fs.createReadStream(`${__dirname}/../lib/client.js`);
  read.on('error', fail);
  const wr = fs.createWriteStream(`${__dirname}/assets/js/client.js`);
  wr.on('error', fail);
  wr.on('close', next);
  return read.pipe(wr);
};

const compile = function (next) {
  let files = fs.readdirSync(`${__dirname}/assets/js`);
  files = files.filter(file => /\.coffee/.test(file));
  return async.each(files, ((file, next) => {
    const [name] = file.split('.');
    const contents = fs.readFileSync(`${__dirname}/assets/js/${file}`, 'utf-8');
    const output = coffee.compile(contents);
    fs.writeFileSync(`${__dirname}/assets/js/${name}.js`, output);
    return next();
  }), (err) => {
    if (err) { return fail(err); }
    return next();
  });
};

copyFile(() => compile(() => {
  const endpoints = {
    '/': (req, res) => res.render('index'),
  };

  const middleware = [
    bodyParser.json(),
    connectAssets({
      jsDir: `${__dirname}/assets/js`,
      src: `${__dirname}/assets/js`,
    }),
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
  app.set('views', `${__dirname}/views`);
  app.set('view engine', 'coffee');
  app.engine('coffee', teacup.renderFile);
  for (const ware of middleware) {
    app.use(ware);
  }
  for (const point of Object.keys(endpoints)) {
    const action = endpoints[point];
    app.get(point, action);
  }
  app.listen(8080);
  return log('server running..., connect to localhost:8080');
}));

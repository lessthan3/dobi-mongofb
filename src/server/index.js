// dependencies
import assert from 'assert';
import Router from 'koa-router';
import compose from 'koa-compose';
import middleware from './middleware';

import {
  find,
  insert,
  read,
  remove,
  update,
} from './routes';

/**
 *
 * @param {Object} config
 * @param {Object} config.cache
 * @param {boolean} config.cache.enabled=true
 * @param {string} config.cache.keyPrefix
 * @param {string} config.cache.redisUri=localhost
 * @param {Object[]} config.firebaseShards
 * @param {string} config.firebaseShards.*.apiKey
 * @param {Object} config.firebaseShards.*.credential
 * @param {string} config.firebaseShards.*.databaseURL
 * @param {Object} config.middleware
 * @param {Object} config.mongodb
 * @param {string} config.mongodb.database
 * @param {string} config.mongodb.host
 * @param {number} config.mongodb.pass
 * @param {string} config.mongodb.port
 * @param {string} config.mongodb.user
 * @param {Object} config.options
 * @param {string[]} config.options.collections=[] array of collections
 * @param {number} config.options.limitDefault=20 default limit of query response
 * @param {number} config.options.limitMax=1000 max returned results
 * @param {function} config.validateSync
 * @param {string} config.root='/api' endpoint root
 */
export default (config) => {
  const { root } = config;
  assert(root, 'root required');
  assert(root[0] === '/', 'root must start with /');

  const {
    findByIdMiddleware,
    findMiddleware,
    insertMiddleware,
    removeMiddleware,
    updateMiddleware,
  } = middleware(config);

  // build routes
  const router = new Router();
  router.get(`${root}/:collection`, findMiddleware, find);
  router.delete(`${root}/:collection/:id`, removeMiddleware, remove);
  router.get(`${root}/:collection/:id/*`, findByIdMiddleware, read);
  router.get(`${root}/:collection/:id`, findByIdMiddleware, read);
  router.patch(`${root}/:collection/:id/*`, updateMiddleware, update);
  router.patch(`${root}/:collection/:id`, updateMiddleware, update);
  router.post(`${root}/:collection`, insertMiddleware, insert);
  return compose([router.routes(), router.allowedMethods()]);
};

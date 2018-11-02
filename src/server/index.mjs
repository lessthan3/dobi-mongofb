/* eslint-disable no-underscore-dangle */

// dependencies
import assert from 'assert';
import Router from 'koa-router';
import middleware from './middleware';

import {
  find,
  findOne,
  insert,
  read,
  remove,
  update,
} from './routes';

const {
  findByIdMiddleware,
  findMiddleware,
  findOneMiddleware,
  insertMiddleware,
  removeMiddleware,
  updateMiddleware,
} = middleware;

/**
 *
 * @param {Object} config
 * @param {Object} config.cache
 * @param {boolean} config.cache.enabled=true
 * @param {number} config.cache.max=100
 * @param {string} config.cache.redisUri=localhost
 * @param {Object[]} config.firebaseShards
 * @param {string} config.firebaseShards.*.apiKey
 * @param {Object} config.firebaseShards.*.credential
 * @param {string} config.firebaseShards.*.databaseURL
 * @param {Object} config.middleware
 * @param {Object} config.mongodb
 * @param {Object} config.options
 * @param {string[]} config.options.collections=[] array of collections
 * @param {number} config.options.limitDefault=20 default limit of query response
 * @param {number} config.options.limitMax=1000 max returned results
 * @param {boolean} config.options.setCreated=true
 * @param {boolean} config.options.setLastModified=true
 * @param {function} config.validateSync
 * @param {string} config.root='/api' endpoint root
 */
export default (config) => {
  // configuration
  const { root } = config;
  assert(root, 'root required');
  assert(root[0] === '/', 'root must start with /');

  // build routes
  const router = new Router();
  router.get(`${root}/:collection/find`, findMiddleware, find);
  router.get(`${root}/:collection/findOne`, findOneMiddleware, findOne);
  router.delete(`${root}/:collection/:id`, removeMiddleware, remove);
  router.get(`${root}/:collection/:id/*`, findByIdMiddleware, read);
  router.get(`${root}/:collection/:id`, findByIdMiddleware, read);
  router.patch(`${root}/:collection/:id`, updateMiddleware, update);
  router.post(`${root}/:collection`, insertMiddleware, insert);
  return router;
};

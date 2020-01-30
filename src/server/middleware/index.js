import bodyParser from 'koa-bodyparser';
import compose from 'koa-compose';
import Cache from 'dobi-cache-2';
import assert from 'assert';
import defaultMongodb from 'mongodb';
import defaultAdmin from 'firebase-admin';
import auth from './auth';
import initState from './initState';
import parseFindParams from './parseFindParams';
import validateCollection from './validateCollection';
import validateId from './validateId';
import validateInsertValue from './validateInsertValue';
import validateUpdateValue from './validateUpdateValue';


export default (config) => {
  const { middleware = {} } = config;

  // for testing
  const { admin = defaultAdmin, mongodb = defaultMongodb } = config.testModules || {};

  const { enabled = true, keyPrefix, redisUri = 'localhost' } = config.cache || {};

  const {
    canRead, canInsert, canRemove, canUpdate, preFind,
  } = middleware;

  assert(canRead, 'middleware.canRead missing');
  assert(canInsert, 'middleware.canInsert missing');
  assert(canRemove, 'middleware.canRemove missing');
  assert(canUpdate, 'middleware.canUpdate missing');
  assert(preFind, 'middleware.preFind missing');


  // create cache
  const { cache } = new Cache({
    enabled,
    keyPrefix,
    redisUri,
  });

  const baseMiddleware = [
    bodyParser(),
    initState({ admin, mongodb, config }),
    validateCollection,
  ];

  const findMiddleware = compose([
    // pre-route
    ...baseMiddleware,
    cache(),
    parseFindParams,
    auth(false),
    preFind,
  ]);


  const findByIdMiddleware = compose([
    ...baseMiddleware,
    // pre-route
    validateId,
    auth(false),
    canRead,
    // post-route
  ]);

  const insertMiddleware = compose([
    // pre-route
    ...baseMiddleware,
    auth(true),
    validateInsertValue,
    canInsert,
  ]);

  const removeMiddleware = compose([
    // pre-route
    ...baseMiddleware,
    validateId,
    auth(true),
    canRemove,
  ]);

  const updateMiddleware = compose([
    // pre-route
    ...baseMiddleware,
    validateId,
    auth(true),
    validateUpdateValue,
    canUpdate,
  ]);

  return {
    findByIdMiddleware,
    findMiddleware,
    insertMiddleware,
    removeMiddleware,
    updateMiddleware,
  };
};

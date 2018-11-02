import bodyParser from 'koa-bodyparser';
import compose from 'koa-compose';
import Cache from 'dobi-cache-2';
import assert from 'assert';
import auth from './auth';
import initState from './initState';
import parseFindParams from './parseFindParams';
import validateCollection from './validateCollection';
import validateId from './validateId';
import validateInsertValue from './validateInsertValue';
import validateUpdateValue from './validateUpdateValue';


export default (config) => {
  const { middleware = {} } = config;
  const { enabled = true, max = 100, redisUri = 'localhost' } = config.cache || {};

  const {
    canRead, canInsert, canRemove, canUpdate, preFind, postFind,
  } = middleware;
  assert(canRead, 'middleware.canRead missing');
  assert(canInsert, 'middleware.canInsert missing');
  assert(canRemove, 'middleware.canRemove missing');
  assert(canUpdate, 'middleware.canUpdate missing');
  assert(preFind, 'middleware.preFind missing');
  assert(postFind, 'middleware.postFind missing');


  // create cache
  const { cache } = new Cache({
    enabled,
    lruMaxItems: max,
    redisUri,
  });

  const baseMiddleware = [
    bodyParser(),
    initState(config),
    validateCollection,
  ];

  const findOneMiddleware = compose([
    // pre-route
    cache(),
    parseFindParams,
    preFind,
    auth(false),

    // post-route
    postFind,
  ]);

  const findMiddleware = compose([
    // pre-route
    cache(),
    parseFindParams,
    preFind,
    auth(false),

    // post-route
    postFind,
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
    ...baseMiddleware,
    // pre-route
    auth(true),
    validateInsertValue,
    canInsert,
  ]);

  const removeMiddleware = compose([
    ...baseMiddleware,
    // pre-route
    validateId,
    auth(true),
    canRemove,
  ]);

  const updateMiddleware = compose([
    ...baseMiddleware,
    // pre-route
    validateId,
    auth(true),
    validateUpdateValue,
    canUpdate,
  ]);

  return {
    findByIdMiddleware,
    findMiddleware,
    findOneMiddleware,
    insertMiddleware,
    removeMiddleware,
    updateMiddleware,
  };
};

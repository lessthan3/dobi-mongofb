import mongodb from 'mongodb';
import get from 'lodash/get';
import { encodeUid } from './utils';

const { ObjectId } = mongodb;

export default async (ctx, next) => {
  const {
    collection, db, insertValue, user,
  } = ctx.state;

  ctx.assert(collection, 500, 'canInsert: missing collection from state');
  ctx.assert(db, 500, 'canInsert: missing db from state');
  ctx.assert(insertValue, 500, 'canInsert: missing value from state');
  ctx.assert(user, 401);

  switch (collection) {
    case 'apps':
    case 'pages': {
      const entityId = get(insertValue, 'entity._id');
      ctx.assert(ObjectId.isValid(entityId), 400, 'invalid entity_id in data');
      const entity = await db.collection('entities').findOne({
        _id: new ObjectId(entityId),
        [`users.${user._id}`]: 'admin',
      });
      ctx.assert(entity, 401, 'unauthorized to insert');
      await next();
      return;
    }
    case 'entities': {
      ctx.assert(
        get(insertValue, `users.${user._id}`) === 'admin',
        401,
        'unauthorized to insert',
      );
      await next();
      return;
    }
    case 'objects':
    case 'media': {
      const { site_id: siteId } = insertValue;
      ctx.assert(ObjectId.isValid(siteId), 400, 'invalid site_id in data');
      const site = await db.collection('sites').findOne({
        _id: new ObjectId(),
        [`users.${encodeUid(user.uid)}`]: 'admin',
      }, { projection: { _id: 1 } });
      ctx.assert(site, 401, 'unauthorized to insert');
      await next();
      return;
    }
    case 'packages': {
      const { config_id: configId } = insertValue;
      ctx.assert(ObjectId.isValid(configId), 400, 'invalid packages_config id in data');
      const packageConfig = await db.collection('packages_config').findOne({
        _id: new ObjectId(configId),
        [`developers.${encodeUid(user.uid)}`]: 'admin',
      }, { projection: { _id: 1 } });
      ctx.assert(packageConfig, 401, 'unauthorized to insert');
      await next();
      return;
    }
    case 'packages_config': {
      ctx.assert(
        get(insertValue, `developers.${encodeUid(user.uid)}`) === 'admin',
        401,
        'unauthorized to insert',
      );
      await next();
      return;
    }
    case 'site_users': {
      ctx.assert(
        get(insertValue, 'user.uid') === user.uid,
        401,
        'unauthorized to insert',
      );
      await next();
      return;
    }
    case 'sites': {
      ctx.assert(
        get(insertValue, `users.${encodeUid(user.uid)}`) === 'admin',
        401,
        'unauthorized to insert',
      );
      await next();
      return;
    }
    case 'users': {
      ctx.assert(insertValue.uid === user.uid, 401, 'unauthorized to insert');
      await next();
      return;
    }
    default: {
      ctx.throw(404);
    }
  }
};

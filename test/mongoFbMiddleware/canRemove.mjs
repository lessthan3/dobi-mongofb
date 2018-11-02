import get from 'lodash/get';
import { encodeUid } from './utils';

export default async (ctx, next) => {
  const {
    collection, currentDocument, db, mongoId, ObjectId, user,
  } = ctx.state;

  ctx.assert(collection, 500, 'canRemove: missing collection from state');
  ctx.assert(currentDocument, 500, 'canRemove: missing currentDocument from state');
  ctx.assert(db, 500, 'canRemove: missing db from state');
  ctx.assert(mongoId, 500, 'canRemove: missing mongoId from state');
  ctx.assert(ObjectId, 500, 'canRemove: missing ObjectId on state');
  ctx.assert(user, 401);

  switch (collection) {
    case 'apps':
    case 'pages': {
      ctx.assert(currentDocument, 400, 'object not found in db');
      const entityId = get(currentDocument, 'entity._id');
      ctx.assert(ObjectId.isValid(entityId), 400, 'object has invalid entity id');
      const entity = await db.collection('entities').findOne({
        _id: new ObjectId(entityId),
      }, { projection: { _id: 1, users: 1 } });
      const key = `users.${user._id}`;
      ctx.assert(
        get(entity, key) === 'admin',
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'entities': {
      const key = `users.${user._id}`;
      ctx.assert(
        get(currentDocument, key) === 'admin',
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'media':
    case 'objects': {
      const { site_id: siteId } = currentDocument;
      ctx.assert(ObjectId.isValid(siteId), 400, 'invalid site_id in data');
      const site = await db.collection('sites').findOne({
        _id: new ObjectId(siteId),
      }, {
        projection: { _id: 1, users: 1 },
      });
      const key = `users.${encodeUid(user.uid)}`;
      ctx.assert(
        get(site, key) === 'admin',
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'packages': {
      const { config_id: configId } = currentDocument;
      ctx.assert(ObjectId.isValid(configId), 400, 'invalid config_id in package');
      const packageConfig = await db.collection('packages_config').findOne({
        _id: new ObjectId(configId),
      }, {
        projection: { _id: 1, developers: 1 },
      });
      const key = `developers.${encodeUid(user.uid)}`;
      ctx.assert(
        get(packageConfig, key) === 'admin',
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'packages_config': {
      const key = `developers.${encodeUid(user.uid)}`;
      ctx.assert(
        get(currentDocument, key) === 'admin',
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'site_users': {
      const { uid } = user;
      ctx.assert(
        get(currentDocument, 'user.uid') === uid,
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'sites': {
      const { uid } = user;
      ctx.assert(
        get(currentDocument, `users.${encodeUid(uid)}`) === 'admin',
        401,
        'unauthorized to remove',
      );
      await next();
      return;
    }
    case 'users': {
      const { uid } = user;
      ctx.assert(currentDocument.uid === uid, 'unauthorized to remove');
      await next();
      return;
    }
    default: {
      ctx.throw(404);
    }
  }
};

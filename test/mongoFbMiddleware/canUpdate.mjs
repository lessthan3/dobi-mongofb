import mongodb from 'mongodb';
import get from 'lodash/get';
import { encodeUid } from './utils';

const { ObjectId } = mongodb;

export default async (ctx, next) => {
  const {
    collection, currentDocument, db, id, mongoId, user, updatedDocument,
  } = ctx.state;

  ctx.assert(collection, 500, 'canRemove: missing collection from state');
  ctx.assert(db, 500, 'canRemove: missing db from state');
  ctx.assert(mongoId, 500, 'canRemove: missing mongoId from state');
  ctx.assert(updatedDocument, 500, 'canRemove: missing updatedDocument from state');
  ctx.assert(user, 401);
  ctx.assert(updatedDocument._id === id, 400, 'modifying object id not permitted');

  switch (collection) {
    case 'apps':
    case 'pages': {
      ctx.assert(currentDocument, 400, 'object not found in db');
      const previousEntityId = get(currentDocument, 'entity._id');
      const newEntityId = get(updatedDocument, 'entity._id');
      ctx.assert(ObjectId.isValid(previousEntityId), 400, 'current object has invalid entity id');
      ctx.assert(ObjectId.isValid(newEntityId), 400, 'updated object has invalid entity id');
      const entities = await db.collection('entities').find({
        _id: {
          $in: [
            new ObjectId(previousEntityId),
            new ObjectId(newEntityId),
          ],
        },
        [`users.${user._id}`]: 'admin',
      }, { projection: { _id: 1 } }).toArray();

      ctx.assert(
        (previousEntityId === newEntityId && entities.length) || (entities.length === 2),
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'entities': {
      const { _id: userId } = user;
      const key = `users.${userId}`;
      ctx.assert(
        get(currentDocument, key) === 'admin' && get(updatedDocument, key) === 'admin',
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'media':
    case 'objects': {
      const { site_id: currentSiteId } = currentDocument;
      const { site_id: newSiteId } = updatedDocument;
      ctx.assert(ObjectId.isValid(currentSiteId), 400, 'invalid site_id in data');
      ctx.assert(ObjectId.isValid(newSiteId), 400, 'invalid site_id in data');
      const sites = await db.collection('sites').find({
        _id: {
          $in: [
            new ObjectId(currentSiteId),
            new ObjectId(newSiteId),
          ],
        },
        [`users.${encodeUid(user.uid)}`]: 'admin',
      }, {
        projection: { _id: 1 },
      }).toArray();
      ctx.assert(
        (currentSiteId === newSiteId && sites.length) || (sites.length === 2),
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'packages': {
      const { config_id: currentConfigId } = currentDocument;
      const { config_id: newConfigId } = updatedDocument;
      ctx.assert(ObjectId.isValid(currentConfigId), 400, 'invalid config_id in package');
      const packageConfigs = await db.collection('packages_config').find({
        _id: {
          $in: [
            new ObjectId(currentConfigId),
            new ObjectId(newConfigId),
          ],
        },
        [`developers.${encodeUid(user.uid)}`]: 'admin',
      }, {
        projection: { _id: 1 },
      }).toArray();
      ctx.assert(
        (currentConfigId === newConfigId && packageConfigs.length) || (packageConfigs.length === 2),
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'packages_config': {
      const key = `developers.${encodeUid(user.uid)}`;
      ctx.assert(
        (get(currentDocument, key) === 'admin') && (get(updatedDocument, key) === 'admin'),
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'site_users': {
      const { uid } = user;
      const key = 'user.uid';
      ctx.assert(
        get(currentDocument, key) === uid && get(updatedDocument, key) === uid,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'sites': {
      const key = `developers.${encodeUid(user.uid)}`;
      ctx.assert(
        get(currentDocument, key) === 'admin' && get(updatedDocument, key) === 'admin',
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    case 'users': {
      const { uid } = user;
      ctx.assert(
        currentDocument.uid === uid && updatedDocument.uid === uid,
        401,
        'unauthorized to update',
      );
      await next();
      return;
    }
    default: {
      ctx.throw(404);
    }
  }
};

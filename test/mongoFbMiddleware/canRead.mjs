import get from 'lodash/get';
import { encodeUid } from './utils';

export default async (ctx, next) => {
  const {
    collection, currentDocument, db, mongoId, ObjectId, user,
  } = ctx.state;

  ctx.assert(collection, 500, 'canRead: missing collection from state');
  ctx.assert(db, 500, 'canRead: missing db from state');
  ctx.assert(mongoId, 500, 'canRead: missing mongoId from state');
  ctx.assert(ObjectId, 500, 'canRead: missing ObjectId from state');

  switch (collection) {
    case 'apps':
    case 'entities':
    case 'media':
    case 'objects':
    case 'pages':
    case 'sites': {
      await next();
      return;
    }
    case 'packages_config':
    case 'packages': {
      ctx.throw(404);
      return;
    }
    case 'site_users': {
      ctx.assert(user, 401);
      const { uid } = user;
      const { _id: siteId } = currentDocument.site;
      ctx.assert(ObjectId.isValid(siteId), 400, 'invalid site_id on user objects');
      const site = await db.collection('sites').findOne({
        _id: new ObjectId(siteId),
      }, { projection: { _id: 1, users: 1 } });
      ctx.assert(
        get(currentDocument, 'user.uid') === uid || get(site, `users.${encodeUid(uid)}`) === 'admin',
        401,
      );
      await next();
      return;
    }
    case 'users': {
      ctx.assert(user, 401);
      const { uid } = user;
      const { site_id: siteId } = currentDocument;
      ctx.assert(ObjectId.isValid(siteId), 400, 'invalid site_id on user objects');
      const site = await db.collection('sites').findOne({
        _id: new ObjectId(siteId),
      }, { projection: { _id: 1, users: 1 } });
      ctx.assert(
        currentDocument.uid === uid || get(site, `users.${encodeUid(uid)}`) === 'admin',
        401,
      );
      await next();
      return;
    }
    default: {
      ctx.throw(404);
    }
  }
};

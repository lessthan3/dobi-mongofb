import get from 'lodash/get';
import { encodeUid } from './utils';

export default async (ctx, next) => {
  const {
    collection, currentDocument, db, ObjectId, user,
  } = ctx.state;

  ctx.assert(collection, 500, 'canRemove: missing collection from state');
  ctx.assert(currentDocument, 500, 'canRemove: missing currentDocument from state');
  ctx.assert(db, 500, 'canRemove: missing db from state');
  ctx.assert(ObjectId, 500, 'canRemove: missing ObjectId on state');
  ctx.assert(user, 401);

  switch (collection) {
    case 'pages': {
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

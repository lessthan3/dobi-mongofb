import mongodb from 'mongodb';
import get from 'lodash/get';
import { encodeUid } from './utils';

const { ObjectId } = mongodb;

export default async (ctx, next) => {
  const {
    collection, currentDocument, db, id, user, updatedDocument,
  } = ctx.state;

  ctx.assert(collection, 500, 'canRemove: missing collection from state');
  ctx.assert(db, 500, 'canRemove: missing db from state');
  ctx.assert(updatedDocument, 500, 'canRemove: missing updatedDocument from state');
  ctx.assert(user, 401);
  ctx.assert(updatedDocument._id === id, 400, 'modifying object id not permitted');

  switch (collection) {
    case 'pages': {
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

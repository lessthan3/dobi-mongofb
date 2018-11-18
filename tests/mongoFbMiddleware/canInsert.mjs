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
  ctx.assert(insertValue, 500, 'canInsert: missing insertValue from state');
  ctx.assert(user, 401);

  switch (collection) {
    case 'pages': {
      const { site_id: siteId } = insertValue;
      ctx.assert(ObjectId.isValid(siteId), 400, 'invalid site_id in data');
      const site = await db.collection('sites').findOne({
        _id: new ObjectId(siteId),
        [`users.${encodeUid(user.uid)}`]: 'admin',
      }, { projection: { _id: 1 } });
      ctx.assert(site, 401, 'unauthorized to insert');
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

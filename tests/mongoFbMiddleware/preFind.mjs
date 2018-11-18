import { encodeUid } from './utils';

export default async (ctx, next) => {
  const {
    collection, db, mongoFbQuery, ObjectId, user,
  } = ctx.state;
  ctx.assert(db, 500, 'preFind: missing db from state');
  ctx.assert(mongoFbQuery, 500, 'preFind: missing mongoFb state');
  ctx.assert(mongoFbQuery.criteria, 500, 'preFind: missing criteria from mongoFbQuery');
  ctx.assert(mongoFbQuery.options, 500, 'preFind: missing options from mongoFbQuery');
  ctx.assert(collection, 500, 'preFind: missing collection state');
  ctx.assert(ObjectId, 500, 'preFind: missing ObjectId state');
  switch (collection) {
    case 'users': {
      ctx.assert(user, 401);
      const { site_id: siteId, uid } = user;
      ctx.assert(uid, 401, 'invalid UID value in user account');
      ctx.assert(siteId && ObjectId.isValid(siteId), 401, 'invalid site_id in user object');
      const site = await db.collection('sites').findOne({
        _id: new ObjectId(siteId),
        [`users.${encodeUid(uid)}`]: 'admin',
      });

      if (site) {
        ctx.state.mongoFbQuery.criteria = {
          ...ctx.state.mongoFbQuery.criteria,
          site_id: siteId.toString(),
        };
      } else {
        ctx.state.mongoFbQuery.criteria = {
          ...ctx.state.mongoFbQuery.criteria,
          site_id: siteId.toString(),
          uid,
        };
      }
      break;
    }
    default: {
      break;
    }
  }

  await next();
};

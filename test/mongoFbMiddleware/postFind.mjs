import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

const postFind = ({ collection, doc, user }) => {
  switch (collection) {
    case 'users': {
      const uid = get(user, 'uid');
      const isUser = uid && (get(doc, 'uid') === uid);
      return isUser ? doc : {};
    }
    default: {
      return doc;
    }
  }
};

export default async (ctx, next) => {
  const { collection, user } = ctx.state;
  ctx.assert(collection, 500, 'postFind: missing collection from state');
  ctx.assert(isObject(ctx.body), 500, 'postFind: ctx.body is not array or object');
  ctx.body = (
    isArray(ctx.body)
      ? [...ctx.body].map((doc => postFind({ collection, doc, user })))
      : postFind(ctx.body)
  );
  await next();
};

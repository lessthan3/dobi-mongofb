import isPlainObject from 'lodash/isPlainObject';
import isObject from 'lodash/isObject';
import set from 'lodash/set';
import { cleanObject } from '../utils';

// adds updatedValue to state
export default async (ctx, next) => {
  const {
    db, collection, currentDocument, id,
  } = ctx.state;
  ctx.assert(db, 500, 'validateUpdateValue: missing db from state');
  ctx.assert(currentDocument, 500, 'validateUpdateValue: missing currentDocument from state');
  ctx.assert(collection, 500, 'validateUpdateValue: missing collection from state');
  ctx.assert(id, 500, 'validateUpdateValue: missing id from state');
  const { key, value: rawValue } = ctx.request.body;
  ctx.assert(typeof key === 'string', 400, 'invalid key');
  ctx.assert(rawValue !== undefined, 400, 'value cannot be undefined');


  // clean up the value
  const value = isObject(rawValue) ? cleanObject(rawValue) : rawValue;

  // create updatedDocument
  let updatedDocument;
  const keyParts = key.split('.');
  if (keyParts.length === 0) {
    ctx.assert(isPlainObject(value), 400, 'update value must be object if modifying root');
    updatedDocument = cleanObject({ ...value });
  } else {
    updatedDocument = cleanObject(set({ ...currentDocument }, keyParts, value));
  }
  ctx.assert(
    updatedDocument._id === currentDocument._id,
    400,
    'modifying _id not permitted',
  );

  ctx.state = {
    ...ctx.state,
    firebaseWriteKey: (
      (keyParts.length ? [collection, id, ...keyParts] : [collection, id])
    ),
    firebaseWriteValue: value,
    currentDocument,
    updatedDocument,
  };
  await next();
};

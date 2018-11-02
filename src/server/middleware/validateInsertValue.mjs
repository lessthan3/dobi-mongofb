import isPlainObject from 'lodash/isPlainObject';
import isNil from 'lodash/isNil';
import { cleanObject } from '../utils';

// adds insertValue to state
export default async (ctx, next) => {
  const { value } = ctx.request.body;
  ctx.assert(isPlainObject(value), 400, 'invalid value to insert');
  ctx.assert(isNil(value._id), 400, 'value must not contain _id');
  ctx.state.insertValue = cleanObject(value);
  await next();
};

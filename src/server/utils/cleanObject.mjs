import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';

const cleanObject = (object, path = []) => {
  let output;
  if (isPlainObject(object)) {
    output = entries(object).reduce((obj, [key, value]) => {
      const newValue = isObject(object) ? cleanObject(value, [...path, key]) : value;
      return isNil(newValue) ? obj : {
        ...obj, [key]: newValue,
      };
    }, {});
  }

  if (isArray(object)) {
    output = object.map((item, index) => (
      isObject(item) ? cleanObject(item, [...path, index.toString()]) : item
    ))
      .filter(item => !isNil(item));
  }

  return isEmpty(output) ? null : output;
};

export default cleanObject;

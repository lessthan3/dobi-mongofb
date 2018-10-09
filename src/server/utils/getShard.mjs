const SHARD_REGEX = /^https?:\/\/([\w\d-_]+)\.firebaseio\.com/;

/**
 * @param {string} databaseURL
 * @return {string}
 */
export default (databaseURL) => {
  const result = SHARD_REGEX.exec(databaseURL);
  if (!result) {
    throw new Error(`invalid shard: ${databaseURL}`);
  }
  return result[1];
};

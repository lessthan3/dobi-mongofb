import { decode } from 'jwt-simple';
import getShard from './getShard';

export default firebaseShards => ({ shard, token }) => {
  let secret;
  for (const { databaseURL, legacySecret } of firebaseShards) {
    if (getShard(databaseURL) === shard) {
      secret = legacySecret;
    }
  }
  if (!secret) {
    throw new Error(`invalid shard: ${shard}`);
  }
  const { legacySecret } = firebaseShards[shard];
  return decode(token, legacySecret);
};

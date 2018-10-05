import { decode } from 'jwt-simple';

export default firebaseShards => ({ shard, token }) => {
  if (!firebaseShards[shard]) {
    throw new Error(`invalid shard: ${shard}`);
  }
  const { legacySecret } = firebaseShards[shard];
  return decode(token, legacySecret);
};

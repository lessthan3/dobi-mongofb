import mongodb from 'mongodb';

const { ObjectId } = mongodb;

// ids
export const alphaSiteId = '5bdce894a1649c5974fb30c3';
export const betaSiteId = '5bdcea23a5b86e5a65b09bb0';
export const alphaPageId = '5bdcea2ba5b86e5a65b09bb1';
export const betaPageId = '5bdcea2ba5b86e5a65b09bb2';
export const alphaAdminUserId = '5bdd0044a5b86e5a65b09bb4';
export const alphaUserId = '5bdce8afa1649c5974fb30c4';
export const betaUserId = '5bdce8d1a1649c5974fb30c5';
export const newPageId = '5bdd2f98b966ff619846ae1a';

export const alphaPage = {
  _id: new ObjectId(alphaPageId),
  created: 100,
  name: 'alphaPage',
  site_id: alphaSiteId,
};
export const betaPage = {
  _id: new ObjectId(betaPageId),
  created: 200,
  name: 'betaPage',
  site_id: betaSiteId,
};

export const alphaSite = {
  _id: new ObjectId(alphaSiteId),
  created: 100,
  family: 'sites',
  name: 'alphaSite',
  users: {
    'test-alphaAdmin@test,com': 'admin',
  },
};
export const betaSite = {
  _id: new ObjectId(betaSiteId),
  created: 200,
  family: 'sites',
  name: 'betaSite',
  users: {
    'test-betaAdmin@test,com': 'admin',
  },
};

export const alphaAdminUser = {
  _id: new ObjectId(alphaAdminUserId),
  created: 100,
  site_id: alphaSiteId,
  uid: 'test-alphaAdmin@test.com',
};

export const alphaUser = {
  _id: new ObjectId(alphaUserId),
  created: 100,
  site_id: alphaSiteId,
  uid: 'test-alpha@test.com',
};

export const betaUser = {
  _id: new ObjectId(betaUserId),
  created: 200,
  site_id: betaSiteId,
  uid: 'test-beta@test.com',
};

export const documents = {
  pages: [
    alphaPage,
    betaPage,
  ],
  sites: [
    alphaSite,
    betaSite,
  ],
  users: [
    alphaAdminUser,
    alphaUser,
    betaUser,
  ],
};

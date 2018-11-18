const { alphaAdminUser, alphaUser, betaUser } = require('./mockDocuments');
const assert = require('assert');

const verifyIdTokenMock = jest.fn((idToken) => {
  const users = {
    alphaAdminUser,
    alphaUser,
    betaUser,
  };
  assert(users[idToken], 'mock: invalid idToken');
  return { user: { ...users[idToken] } };
});
const signInWithCustomTokenMock = jest.fn((customToken) => {
  assert(customToken === 'validToken', 'invalidToken');
});
const authMock = jest.fn(() => ({
  currentUser: {
    getIdToken: async () => 'mockIdToken',
    getIdTokenResult: () => ({
      _id: 'mockUserId',
      uid: 'email-test@mock.com',
    }),
    refreshToken: 'mockRefreshToken',
  },
  signInWithCustomToken: signInWithCustomTokenMock,
  signOut: async () => {},
  verifyIdToken: verifyIdTokenMock,
}));
const setMock = jest.fn();
const onMock = jest.fn();
const offMock = jest.fn();
const onceMock = jest.fn();
const refMock = jest.fn(() => ({
  on: onMock, off: offMock, once: onceMock, set: setMock,
}));
const priorityMock = jest.fn();
const databaseMock = jest.fn(() => ({ ref: refMock, priority: priorityMock }));
const initializeAppMock = jest.fn(() => ({
  auth: authMock,
  database: databaseMock,
}));
const adminMock = {
  credential: {
    cert: val => val,
  },
  initializeApp: initializeAppMock,
};

module.exports = {
  ...adminMock,
  mocks: {
    adminMock,
    authMock,
    databaseMock,
    initializeAppMock,
    priorityMock,
    offMock,
    onceMock,
    onMock,
    refMock,
    setMock,
    verifyIdTokenMock,
  },
};

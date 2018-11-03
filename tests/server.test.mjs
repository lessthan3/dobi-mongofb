import request from 'supertest';
import bodyParser from 'koa-bodyparser';
import Koa from 'koa';
import hasIn from 'lodash/hasIn';
import set from 'lodash/set';
import mongodb from 'mongodb';
import mongoFb from '../src/server';
import baseConfig from './config';
import { createFirebaseMock, createMongoMock } from './utils';
import { cleanObject } from '../src/server/utils';
import {
  alphaPage,
  alphaPageId,
  alphaSite,
  alphaSiteId,
  alphaUserId,
  betaSiteId,
  betaUserId,
  newPageId,
} from './mockDocuments';

const { root } = baseConfig;
const { ObjectId } = mongodb;

// server
let app;

const {
  adminMock,
  refMock,
  setMock,
} = createFirebaseMock(jest);

const {
  deleteOneMock,
  findMock,
  findOneMock,
  insertOneMock,
  mongodbMock,
  updateMock,
} = createMongoMock(jest);

beforeEach(() => {
  const server = new Koa();
  server.use(bodyParser());
  server.use(mongoFb({
    ...baseConfig,
    testModules: { admin: adminMock, mongodb: mongodbMock },
  }));
  app = server.callback();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe.only('GET :collection/findOne', () => {
  it('returns expected values', async () => {
    const response = await request(app).get(`${root}/sites/findOne`)
      .query({
        criteria: JSON.stringify(({
          _id: alphaSiteId,
          'users.test-alphaAdmin@test,com': 'admin',
        })),
      });

    // expect(response.text).toBe('hahha');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...alphaSite, _id: alphaSiteId });
    expect(findOneMock).toHaveBeenCalledWith('sites', {
      'users.test-alphaAdmin@test,com': 'admin',
    });
  });
});

describe('utils/cleanObject', () => {
  it('parses primary values correctly', () => {
    const obj = {
      array: [
        { foo: 'bar' },
        ['foo', null, undefined, [], { emptyArray: [], emptyObject: {} }],
        0,
        '',
        'foo',
        null,
        undefined,
        {},
        [],
        [[], {}],
        { emptyArray: [], emptyObject: [] },
      ],
      arrayEmpty: [null, undefined, [[], {}], { emptyArray: [], emptyObject: [] }],
      objectEmpty: {
        nullKey: null,
        undefinedKey: undefined,
      },
      booleanTrue: true,
      booleanFalse: false,
      object: {
        array: ['foo'],
        arrayEmpty: [null, undefined, [[], {}], { emptyArray: [], emptyObject: [] }],
        booleanTrue: true,
        booleanFalse: false,
        numberFloat: 123.45,
        numberInt: 123,
        numberZero: 0,
        object: { foo: 'bars' },
        objectEmpty: {
          nullKey: null,
          undefinedKey: undefined,
        },
        string: 'foo',
        stringEmpty: '',
      },
      numberFloat: 123.45,
      numberInt: 123,
      numberZero: 0,
      string: 'foo',
      stringEmpty: '',
    };
    const result = cleanObject(obj);
    expect(result.array).toMatchSnapshot();
    expect(hasIn(result, 'arrayEmpty')).not.toBeTruthy();
    expect(hasIn(result, 'objectEmpty')).not.toBeTruthy();
    expect(result.booleanTrue).toBe(true);
    expect(result.booleanFalse).toBe(false);
    expect(result.object).toMatchSnapshot();
    expect(result.numberFloat).toMatchSnapshot();
    expect(result.numberInt).toEqual(123);
    expect(result.numberInt).toMatchSnapshot();
    expect(result.numberZero).toMatchSnapshot();
    expect(result.string).toMatchSnapshot();
    expect(result.stringEmpty).toMatchSnapshot();
  });
});

describe('DELETE :collection/:id', () => {
  it('fails on bad collection', async () => {
    const response = await request(app)
      .delete(`${root}/fakeCollection/${alphaSiteId}`);
    expect(response.status).toBe(404);
  });

  it('fails if no auth', async () => {
    const response = await request(app)
      .delete(`${root}/pages/${alphaPageId}`);
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });

  it('fails if no auth', async () => {
    const response = await request(app)
      .delete(`${root}/pages/${alphaPageId}`);
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });

  it('fails if user not admin (client middleware test)', async () => {
    const response = await request(app)
      .delete(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });

  it('returns if user is admin (client middleware test)', async () => {
    const response = await request(app)
      .delete(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(200);
    expect(refMock).toHaveBeenCalledWith(`pages/${alphaPageId}`);
    expect(setMock).toHaveBeenCalledWith(null);
    expect(setMock).toHaveBeenCalledTimes(2);
    expect(deleteOneMock).toHaveBeenCalledWith('pages', { _id: new ObjectId(alphaPageId) });
  });
});

describe('GET :collection/:id', () => {
  it('fails on bad collection', async () => {
    const response = await request(app)
      .get(`${root}/fakeCollection/${alphaSiteId}`);
    expect(response.status).toBe(404);
  });
  it('fails on bad id', async () => {
    const response = await request(app)
      .get(`${root}/sites/123`);
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });
  it('fails on protected value if no auth', async () => {
    const response = await request(app)
      .get(`${root}/users/${alphaUserId}`);
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });
  it('fails on protected value if wrong user', async () => {
    const response = await request(app)
      .get(`${root}/users/${alphaUserId}`)
      .set('Authorization', 'Bearer betaUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });
  it('fails on protected value if wrong admin (client middleware test)', async () => {
    const response = await request(app)
      .get(`${root}/users/${betaUserId}`)
      .set('Authorization', 'Bearer alphaUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });
  it('returns on protected value when authd', async () => {
    const response = await request(app)
      .get(`${root}/users/${alphaUserId}`)
      .set('Authorization', 'Bearer alphaUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
    expect(findOneMock).toHaveBeenCalledWith('users', {
      _id: new ObjectId(alphaUserId),
    });
  });
  it('returns on protected value when user is admin (client middleware test)', async () => {
    const response = await request(app)
      .get(`${root}/users/${alphaUserId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
    expect(findOneMock).toHaveBeenCalledWith('users', {
      _id: new ObjectId(alphaUserId),
    });
  });
  it('returns expected value', async () => {
    const response = await request(app)
      .get(`${root}/sites/${alphaSiteId}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
    expect(findOneMock).toHaveBeenCalledWith('sites', {
      _id: new ObjectId(alphaSiteId),
    });
  });
});

describe('PATCH :collection/:id', () => {
  let mockWrite;
  let mockKey;
  let mockValue;
  let mockValueClean;
  beforeEach(() => {
    mockKey = 'data.test';
    mockValue = { item: 'myUpdate', author: { name: 'steve', extra: [{}, [], null] } };
    mockValueClean = { item: 'myUpdate', author: { name: 'steve' } };
    mockWrite = { key: mockKey, value: { ...mockValue } };
  });
  it('fails if user not authd', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .send(mockWrite);
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if bad collection', async () => {
    const response = await request(app)
      .patch(`${root}/fakeCollection/${alphaPageId}`)
      .send(mockWrite);
    expect(response.status).toBe(404);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if user not admin (client middleware test)', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer betaUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send(mockWrite);
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if user doesnt send a value', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: mockKey });
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if key isnt a string', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: 5, value: { ...mockValue } });
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if key is empty (meaning root) and value isnt an object', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: '', value: [] });
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });
  for (const char of ['$', '#', '[', ']', '/', ' ', '  ', '{', '}']) {
    it(`fails if key is contains '${char}'`, async () => {
      const response = await request(app)
        .patch(`${root}/pages/${alphaPageId}`)
        .set('Authorization', 'Bearer alphaAdminUser')
        .set('x-bearer-token-shard', 'testAlpha')
        .send({ key: `data.${char}`, value: { ...mockValue } });
      expect(response.status).toBe(400);
      expect(response.text).toMatchSnapshot();
    });
  }
  it('fails if key part contains empty string', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: 'data..thing', value: { ...mockValue } });
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });

  it('fails if a root write but the _id was updated', async () => {
    const newId = '5bdd46a0b966ff619846ae1b';
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: '', value: { ...mockValue, _id: newId } });
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });

  it('succeeds for non-root update if admin is authed (client middleware test)', async () => {
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: mockKey, value: { ...mockValue } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
    expect(refMock).toHaveBeenCalledWith(`pages/${alphaPageId}/data/test`);
    expect(setMock).toHaveBeenCalledWith({ ...mockValueClean });
    expect(setMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledWith('pages', {
      _id: new ObjectId(alphaPageId),
    }, {
      ...set({ ...alphaPage }, mockKey, mockValueClean),
      _id: new ObjectId(alphaPageId),
    });
  });

  it('succeeds for root update if admin is authed (client middleware test)', async () => {
    const rootUpdate = set({ ...alphaPage }, mockKey, mockValue);
    const rootUpdateClean = set({ ...alphaPage }, mockKey, mockValueClean);
    const firebaseSetValue = { ...rootUpdateClean, _id: rootUpdateClean._id.toString() };
    const response = await request(app)
      .patch(`${root}/pages/${alphaPageId}`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ key: '', value: { ...rootUpdate } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
    expect(refMock).toHaveBeenCalledWith(`pages/${alphaPageId}`);
    expect(setMock).toHaveBeenCalledWith(firebaseSetValue);
    expect(updateMock).toHaveBeenCalledWith('pages', {
      _id: new ObjectId(alphaPageId),
    }, {
      ...rootUpdateClean,
      _id: new ObjectId(alphaPageId),
    });
  });
});

describe('POST :collection/:id', () => {
  let mockValue;
  beforeEach(() => {
    mockValue = {
      created: 200,
      name: 'gammaPage',
      site_id: betaSiteId,
    };
  });

  it('fails if user not authd', async () => {
    const response = await request(app)
      .post(`${root}/users`)
      .send({ value: { ...mockValue } });
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if bad collection', async () => {
    const response = await request(app)
      .post(`${root}/fakeCollection`)
      .send({ value: { ...mockValue } });
    expect(response.status).toBe(404);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if user doesnt send a value', async () => {
    const response = await request(app)
      .post(`${root}/pages`)
      .set('Authorization', 'Bearer alphaUser')
      .set('x-bearer-token-shard', 'testAlpha');
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if object has an _id in it', async () => {
    const response = await request(app)
      .post(`${root}/pages`)
      .set('Authorization', 'Bearer alphaUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({
        value: { ...mockValue, _id: newPageId },
      });
    expect(response.status).toBe(400);
    expect(response.text).toMatchSnapshot();
  });
  it('fails if user isnt an admin (client middleware test)', async () => {
    const response = await request(app)
      .post(`${root}/pages`)
      .set('Authorization', 'Bearer alphaUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({ value: { ...mockValue } });
    expect(response.status).toBe(401);
    expect(response.text).toMatchSnapshot();
  });

  it('returns if user is admin (client middleware test)', async () => {
    const response = await request(app)
      .post(`${root}/pages`)
      .set('Authorization', 'Bearer alphaAdminUser')
      .set('x-bearer-token-shard', 'testAlpha')
      .send({
        value: {
          created: 200,
          name: 'gammaPage',
          site_id: alphaSiteId,
        },
      });
    expect(response.status).toBe(200);
    expect(response.text).toMatchSnapshot();
    expect(insertOneMock).toHaveBeenCalledWith('pages', {
      created: 200,
      name: 'gammaPage',
      site_id: alphaSiteId,
    });
    expect(refMock).toHaveBeenCalledWith(`pages/${newPageId}`);
    expect(setMock).toHaveBeenCalledTimes(2);
    expect(setMock).toHaveBeenCalledWith({
      _id: newPageId,
      created: 200,
      name: 'gammaPage',
      site_id: alphaSiteId,
    });
  });
});

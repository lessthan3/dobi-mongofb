import { alphaPageId, alphaSiteId } from './mockDocuments';

const DATABASE_API_KEY = 'MOCK_API_KEY';
const DATABASE_URL = 'https://mongofb-mock.firebaseio.com';
let initializeAppMock;

let client;
let Database;
let axios;
let firebase;

beforeAll(() => {
  Date.now = () => 123123123;
});
beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  client = await (import('../src/client'));
  ({ axios, firebase, Database } = client);
  ({ initializeApp: initializeAppMock } = firebase);
});

describe('Database', () => {
  let instance;
  beforeEach(() => {
    instance = new Database({
      api: '/app/v1',
      firebase: {
        apiKey: DATABASE_API_KEY,
        databaseURL: DATABASE_URL,
      },
    });
  });
  it('initializes correctly', () => {
    expect(initializeAppMock).toHaveBeenCalledWith({
      apiKey: DATABASE_API_KEY,
      databaseURL: DATABASE_URL,
    }, `dobi-mongofb-${DATABASE_URL}`);
    expect(instance).toMatchSnapshot();
  });
  it('logs in correctly', async () => {
    await instance.signInWithCustomToken('validToken');
    expect(instance.refreshToken).toBe('mockRefreshToken');
    expect(instance.currentUser).toEqual({
      _id: 'mockUserId',
      uid: 'email-test@mock.com',
    });
  });
  it('logs out correctly', async () => {
    await instance.signInWithCustomToken('validToken');
    expect(instance.refreshToken).toBe('mockRefreshToken');
    expect(instance.currentUser).toEqual({
      _id: 'mockUserId',
      uid: 'email-test@mock.com',
    });
    await instance.signOut();
    expect(instance.refreshToken).toBe(null);
    expect(instance.currentUser).toBe(null);
  });
  it('appends authorization header to requests if logged in', async () => {
    await instance.signInWithCustomToken('validToken');
    await instance.request({
      method: 'GET',
      resource: 'sites',
    });
    expect(axios).toHaveBeenCalledWith({
      data: {},
      headers: {
        authorization: 'Bearer mockIdToken',
        'x-bearer-token-shard': 'mongofb-mock',
      },
      method: 'GET',
      params: {},
      responseType: 'json',
      url: '/app/v1/sites',
    });
  });
});

describe('Collection', () => {
  let instance;
  let pages;
  let users;
  beforeEach(() => {
    instance = new Database({
      api: '/app/v1',
      firebase: {
        apiKey: DATABASE_API_KEY,
        databaseURL: DATABASE_URL,
      },
    });
    pages = instance.collection('pages');
    users = instance.collection('users');
  });

  it('initializes correctly', () => {
    expect(pages).toMatchSnapshot();
    expect(users).toMatchSnapshot();
  });
  it('inserts correctly', async () => {
    const item = { data: { fromTest: true }, name: 'test object', site_id: alphaSiteId };
    const doc = await pages.insert(item);
    expect(doc.collection.name).toMatchSnapshot();
    expect(doc.data).toMatchSnapshot();
    expect(doc.key).toMatchSnapshot();
    expect(doc.query).toMatchSnapshot();
    const { ref: refMock } = pages.database.firebase.database();
    expect(refMock).toHaveBeenCalledWith('pages/123123123');
    expect(axios).toHaveBeenCalledWith({
      data: {
        priority: null,
        value: { data: { fromTest: true }, name: 'test object', site_id: alphaSiteId },
      },
      headers: {},
      method: 'POST',
      params: {
        _: 123123123,
      },
      responseType: 'json',
      url: '/app/v1/pages',
    });
  });
  it('finds correctly with criteria options and fields', async () => {
    const criteria = { _id: alphaSiteId, name: 'sites' };
    const options = { limit: 5, sort: { created: 1 } };
    const fields = { _id: 1 };
    const result = await pages.find(criteria, fields, options);
    expect(result.length).toEqual(2);
    expect(result[0].collection.name).toMatchSnapshot();
    expect(result[0].data).toMatchSnapshot();
    expect(result[0].key).toMatchSnapshot();
    expect(result[0].query).toMatchSnapshot();
    expect(result[1].collection.name).toMatchSnapshot();
    expect(result[1].data).toMatchSnapshot();
    expect(result[1].key).toMatchSnapshot();
    expect(result[1].query).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: {
      },
      headers: {},
      method: 'GET',
      params: {
        criteria: '{"_id":"5bdce894a1649c5974fb30c3","name":"sites"}',
        options: '{"limit":5,"sort":{"created":1},"projection":{"_id":1}}',
      },
      responseType: 'json',
      url: '/app/v1/pages',
    });
  });
  it('finds returns correctly with criteria fields and options', async () => {
    const criteria = { _id: alphaSiteId, name: 'sites' };
    const options = { limit: 5, sort: { created: 1 } };
    const fields = { _id: 1 };
    const result = await pages.find(criteria, options, fields);
    expect(result.length).toEqual(2);
    expect(result[0].collection.name).toMatchSnapshot();
    expect(result[0].data).toMatchSnapshot();
    expect(result[0].key).toMatchSnapshot();
    expect(result[0].query).toMatchSnapshot();
    expect(result[1].collection.name).toMatchSnapshot();
    expect(result[1].data).toMatchSnapshot();
    expect(result[1].key).toMatchSnapshot();
    expect(result[1].query).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: {
      },
      headers: {},
      method: 'GET',
      params: {
        criteria: '{"_id":"5bdce894a1649c5974fb30c3","name":"sites"}',
        options: '{"limit":5,"sort":{"created":1},"projection":{"_id":1}}',
      },
      responseType: 'json',
      url: '/app/v1/pages',
    });
  });
  it('finds returns correctly with criteria and fields', async () => {
    const criteria = { _id: alphaSiteId, name: 'sites' };
    const fields = { _id: 1 };
    const result = await pages.find(criteria, fields);
    expect(result.length).toEqual(2);
    expect(result[0].collection.name).toMatchSnapshot();
    expect(result[0].data).toMatchSnapshot();
    expect(result[0].key).toMatchSnapshot();
    expect(result[0].query).toMatchSnapshot();
    expect(result[1].collection.name).toMatchSnapshot();
    expect(result[1].data).toMatchSnapshot();
    expect(result[1].key).toMatchSnapshot();
    expect(result[1].query).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: {
      },
      headers: {},
      method: 'GET',
      params: {
        criteria: '{"_id":"5bdce894a1649c5974fb30c3","name":"sites"}',
        options: '{"projection":{"_id":1}}',
      },
      responseType: 'json',
      url: '/app/v1/pages',
    });
  });
  it('finds returns correctly with criteria and options', async () => {
    const criteria = { _id: alphaSiteId, name: 'sites' };
    const options = { sort: { created: 1 } };
    const result = await pages.find(criteria, options);
    expect(result.length).toEqual(2);
    expect(result[0].collection.name).toMatchSnapshot();
    expect(result[0].data).toMatchSnapshot();
    expect(result[0].key).toMatchSnapshot();
    expect(result[0].query).toMatchSnapshot();
    expect(result[1].collection.name).toMatchSnapshot();
    expect(result[1].data).toMatchSnapshot();
    expect(result[1].key).toMatchSnapshot();
    expect(result[1].query).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: {
      },
      headers: {},
      method: 'GET',
      params: {
        criteria: '{"_id":"5bdce894a1649c5974fb30c3","name":"sites"}',
        options: '{"sort":{"created":1}}',
      },
      responseType: 'json',
      url: '/app/v1/pages',
    });
  });
  it('findOne returns correctly', async () => {
    const criteria = { _id: alphaSiteId, name: 'sites' };
    const options = { limit: 5, sort: { created: 1 } };
    const fields = { _id: 1 };
    const result = await pages.findOne(criteria, options, fields);
    expect(result.collection.name).toMatchSnapshot();
    expect(result.data).toMatchSnapshot();
    expect(result.key).toMatchSnapshot();
    expect(result.query).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: {
      },
      headers: {},
      method: 'GET',
      params: {
        criteria: '{"_id":"5bdce894a1649c5974fb30c3","name":"sites"}',
        options: '{"limit":1,"sort":{"created":1},"projection":{"_id":1}}',
      },
      responseType: 'json',
      url: '/app/v1/pages',
    });
  });
  it('findById returns correctly', async () => {
    const options = { limit: 5, sort: { created: 1 } };
    const fields = { _id: 1 };
    const result = await pages.findById(alphaPageId, options, fields);
    expect(result.collection.name).toMatchSnapshot();
    expect(result.data).toMatchSnapshot();
    expect(result.key).toMatchSnapshot();
    expect(result.query).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: {},
      headers: {},
      method: 'GET',
      params: {
        criteria: '{"_id":"5bdcea2ba5b86e5a65b09bb1"}',
        options: '{"limit":1,"sort":{"created":1},"projection":{"_id":1}}',
      },
      responseType: 'json',
      url: `/app/v1/pages/${alphaPageId}`,
    });
  });
});

describe('document', () => {
  let document;

  beforeEach(async () => {
    const database = new Database({
      api: '/app/v1',
      firebase: {
        apiKey: DATABASE_API_KEY,
        databaseURL: DATABASE_URL,
      },
    });
    await database.signInWithCustomToken('validToken');
    const pages = database.collection('pages');
    document = await pages.findOne();
  });

  it('root val to return expected value', () => {
    expect(document.val()).toMatchSnapshot();
  });
  it('get to return expected value', () => {
    const refA = document.get('data');
    const { _id: objectId } = document.val();
    expect(refA.val()).toEqual({ fromTest: true });
    expect(refA.key).toEqual(`pages/${objectId}/data`);
    expect(refA.path).toEqual(['data']);
    const refB = refA.get('fromTest');
    expect(refB.val()).toEqual(true);
    expect(refB.path).toEqual(['data', 'fromTest']);
    expect(refB.key).toEqual(`pages/${objectId}/data/fromTest`);
  });
  it('parent returns expected value', () => {
    const refA = document.get('data');
    const refB = refA.parent();
    expect(refB.val()).toMatchSnapshot();
    const refC = refB.parent();
    expect(refC.val()).toMatchSnapshot();
  });
  it('name returns expected value', () => {
    expect(document.name()).toBe('123123123');
    const refA = document.get('data');
    expect(refA.name()).toBe('data');
  });
  it('root set updates document correctly', async () => {
    const newDocument = {
      ...document.val(),
      newData: {
        foo: 'bar',
      },
    };
    const result = await document.set({
      ...document.val(),
      newData: {
        foo: 'bar',
      },
    });
    expect(result).toMatchSnapshot();
    expect(document.val()).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: { value: newDocument },
      headers: {
        authorization: 'Bearer mockIdToken',
        'x-bearer-token-shard': 'mongofb-mock',
      },
      method: 'PATCH',
      params: {},
      responseType: 'json',
      url: '/app/v1/pages/123123123',
    });
  });
  it('nested set updates document correctly', async () => {
    const newData = { foo: 'bar' };
    const ref = document.get('newData');
    const result = await ref.set(newData);
    expect(result).toMatchSnapshot();
    expect(ref.val()).toMatchSnapshot();
    expect(axios).toHaveBeenCalledWith({
      data: { value: newData },
      headers: {
        authorization: 'Bearer mockIdToken',
        'x-bearer-token-shard': 'mongofb-mock',
      },
      method: 'PATCH',
      params: {},
      responseType: 'json',
      url: '/app/v1/pages/123123123/newData',
    });
  });
  it('on update fires as expected', async () => {
    const newData = { foo: 'bar' };
    const ref = document.get('newData');
    const onUpdateMock = jest.fn();
    ref.on('update', onUpdateMock);
    await ref.set(newData);
    expect(onUpdateMock).toHaveBeenCalledWith(newData);
    await ref.set(null);
    expect(onUpdateMock).toHaveBeenCalledWith(null);
  });
  it('on value fires as expected', async () => {
    const newData = { foo: 'bar' };
    const ref = document.get('newData');
    const onValueMock = jest.fn();
    ref.on('value', onValueMock);
    await ref.set(newData);
    expect(onValueMock).toHaveBeenCalledWith(newData);
    await ref.set(null);
    expect(onValueMock).toHaveBeenCalledWith(null);
  });
  it('off value cancels listener', async () => {
    const newData = { foo: 'bar' };
    const ref = document.get('newData');
    const onValueMock = jest.fn();
    ref.on('value', onValueMock);
    expect(ref.events.value).toEqual([onValueMock]);
    await ref.set(newData);
    ref.off('value', onValueMock);
    expect(ref.events.value).toEqual([]);
    await ref.set(null);
    expect(onValueMock).toHaveBeenCalledWith(newData);
    expect(onValueMock).toHaveBeenCalledTimes(2);
  });
  it('off update cancels listener', async () => {
    const newData = { foo: 'bar' };
    const ref = document.get('newData');
    const onUpdateMock = jest.fn();
    ref.on('update', onUpdateMock);
    expect(ref.events.update).toEqual([onUpdateMock]);
    await ref.set(newData);
    ref.off('update', onUpdateMock);
    expect(ref.events.update).toEqual([]);
    await ref.set(null);
    expect(onUpdateMock).toHaveBeenCalledWith(newData);
    expect(onUpdateMock).toHaveBeenCalledTimes(1);
  });
});

const documents = require('./mockDocuments');

const { alphaSiteId } = documents;
module.exports = jest.fn(({
  data,
  method,
  url,
}) => {
  let outputData;
  switch (method) {
    case 'GET': {
      outputData = [{
        _id: '123123123',
        data: { fromTest: true },
        name: 'test object',
        site_id: alphaSiteId,
      }, {
        _id: '321321321',
        data: { fromTest: true },
        name: 'test object 2',
        site_id: alphaSiteId,
      }];
      break;
    }
    case 'PATCH': {
      outputData = {
        value: data.value,
      };
      break;
    }
    case 'POST': {
      outputData = {
        _id: '123123123',
        data: { fromTest: true },
        name: 'test object',
        site_id: alphaSiteId,
      };
      break;
    }
  }
  return { data: outputData };
});

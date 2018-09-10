import axios from 'axios';

export default async (options) => {
  const { params: _params = {} } = options;
  const { cache, json, url } = options;

  const params = _params;

  if (!cache) {
    if (params._ == null) {
      params._ = Date.now();
    }
  }

  const { data } = await axios({
    method: 'get',
    params,
    responseType: json ? 'json' : 'text',
    url,
  });

  if (!data) {
    throw new Error('missing data');
  }

  return data;
};

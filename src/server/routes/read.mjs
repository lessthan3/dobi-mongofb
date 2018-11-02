import get from 'lodash/get';
import trim from 'lodash/trim';

export default async (ctx) => {
  const { currentDocument } = ctx.state;
  const { 0: path } = ctx.params;
  ctx.assert(currentDocument, 500, 'read: missing current document from state');
  ctx.status = 200;
  ctx.body = path ? get(currentDocument, trim(path, '/').split('/'), '') : currentDocument;
};

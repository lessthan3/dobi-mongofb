import promisify from '@google-cloud/promisify';
import Collection from './Collection';
import { prepareFind } from './utils';

const { promisifyAll } = promisify;

class PseudoCollection extends Collection {
  constructor(database, name, defaults) {
    super(database, name);
    this.database = database;
    this.name = name;
    this.defaults = defaults == null ? {} : defaults;
  }

  insert(_doc, priority, next) {
    const doc = _doc;
    for (const k of Object.keys(this.defaults)) {
      const v = this.defaults[k];
      doc[k] = v;
    }
    return super.insert(doc, priority, next);
  }

  find(criteria = null, fields = null, options = null, _next = null) {
    const [query, , next] = prepareFind(criteria, fields, options, _next);
    query.criteria = {
      ...query.criteria,
      ...this.defaults,
    };
    return super.find(query.criteria, query.fields, query.options, next);
  }

  findOne(criteria = null, fields = null, options = null, _next = null) {
    const [query, , next] = prepareFind(criteria, fields, options, _next);
    for (const k of Object.keys(this.defaults)) {
      const v = this.defaults[k];
      query.criteria[k] = v;
    }
    return super.findOne(query.criteria, query.fields, query.options, next);
  }
}

promisifyAll(PseudoCollection, { singular: true });

export default PseudoCollection;

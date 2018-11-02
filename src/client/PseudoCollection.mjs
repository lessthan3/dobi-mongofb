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

  insert(doc, priority, next) {
    return super.insert({ ...doc, ...this.defaults }, priority, next);
  }

  /**
   * @param {Object} criteria
   * @param {Object} fields
   * @param {Object} options
   * @param {Function} next
   */
  find(...args) {
    const { next, query } = prepareFind(args);
    const { criteria: queryCriteria, fields, options } = query;
    const criteria = {
      ...queryCriteria,
      ...this.defaults,
    };
    return super.find(criteria, fields, options, next);
  }

  /**
   * @param {Object} criteria
   * @param {Object} fields
   * @param {Object} options
   * @param {Function} next
   */
  findOne(...args) {
    const { query, next } = prepareFind(args);

    const { criteria: queryCriteria, fields, options } = query;

    const criteria = {
      ...queryCriteria,
      ...this.defaults,
    };

    return super.findOne(criteria, fields, options, next);
  }
}

promisifyAll(PseudoCollection, { singular: true });

export default PseudoCollection;

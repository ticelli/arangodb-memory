const set = require('lodash.set');
const get = require('lodash.get');
const AbstractCollection = require('simple-arangorm/model/document');
const Fork = require('./model/edge/fork.js');

const cachedSymbol = Symbol('cached');
const contextSymbol = Symbol('context');

module.exports = class Memory {
  constructor() {
    this[contextSymbol] = [];
  }

  async lookup(...objects) {
    this[contextSymbol].push(...objects);
    this[cachedSymbol] = null;
    return this;
  }

  async set(...params) {
    let [value, key, namespace] = params.reverse(); // eslint-disable-line prefer-const
    let target;
    if (!namespace) {
      target = this[contextSymbol].slice(-1).pop();
    } else {
      if (typeof namespace === 'object') {
        target = namespace;
      }
      for (const c of this[contextSymbol].reverse()) {
        if (c.collectionName === namespace) {
          target = c;
          break;
        }
      }
    }
    if (!target) {
      throw new Error('Namespace not found');
    }
    target = target.with(set({}, key, value));
    try {
      await target.create();
    } catch (e) {
      await target.save();
    }
    return this;
  }

  async get(...params) {
    let [key, namespace] = params.reverse(); // eslint-disable-line prefer-const
    if (namespace) {
      if (typeof namespace === 'object') {
        namespace = namespace.collectionName;
      } else if (AbstractCollection.registry.has(namespace)) {
        namespace = AbstractCollection.registry.get(namespace).collectionName;
      }
    }

    if (!this[cachedSymbol]) {
      // @todo make this template safe, with aql or qb ; Security concerns
      const results = await AbstractCollection.query(`
      FOR v in [${this[contextSymbol].map(c => `DOCUMENT("${c.id}")`).join(', ')}]
        FILTER NOT_NULL(v)
      return MERGE(v, MERGE(
        FOR forked, edge 
          IN 0..5 OUTBOUND v ${Fork.collectionName}
          FILTER edge.createAt > "${(new Date(Date.now() - 1000 * 3600 * 4)).toISOString()}"
        return forked
      ))
      `);
      this[cachedSymbol] = await results.all();
    }

    for (const row of this[cachedSymbol]) {
      const data = get(row, key);
      if (data && (!namespace || row._id.startsWith(`${namespace}/`))) {
        return data;
      }
    }
    return undefined;
  }
};

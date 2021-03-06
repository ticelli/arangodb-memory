const set = require('lodash.set');
const get = require('lodash.get');
const { aql } = require('arangojs');
const AbstractCollection = require('simple-arangorm/model/document');
const Fork = require('./model/edge/fork.js');
const State = require('./model/collection/state.js');

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
    if (key) {
      value = set({}, key, value);
    }
    target = target.with(value);
    try {
      await target.create();
    } catch (e) {
      await target.save();
    }
    return target;
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
          FILTER edge.createdAt > "${(new Date(Date.now() - 1000 * 3600 * 4)).toISOString()}"
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

  async fork(...params) {
    let [value, key, namespace] = params.reverse(); // eslint-disable-line prefer-const
    let target;
    if (!namespace) {
      target = State.new;
    } else {
      if (typeof namespace === 'object') {
        target = namespace;
      } else if (AbstractCollection.registry.has(namespace)) {
        target = AbstractCollection.registry.get(namespace);
      }
    }
    if (!target) {
      throw new Error('Namespace not found');
    }
    if (key) {
      value = set({}, key, value);
    }
    target = target.with(value);
    await target.create();
    await Fork.new.from(this[contextSymbol].slice(-1).pop()).to(target).create();
    return target;
  }

  async clear() {
    const target = this[contextSymbol].slice(-1).pop();
    if (!target) {
      throw new Error('No target found');
    }
    const Target = target.constructor;
    const query = await AbstractCollection.query(aql`
      FOR a IN UNIQUE(FLATTEN(FOR forked, edge 
      IN 0..5 OUTBOUND ${target.id} fork
      COLLECT ids = [forked._id, edge._id]
  return ids))
      FILTER NOT_NULL(a)
      return a
      `);
    const results = await query.all();
    return Promise.all(
      results.map(id => {
        const [collectionName, key] = id.split('/', 2);
        switch (collectionName) {
          case Fork.collectionName:
            return Fork.new.withKey(key).remove();
          case State.collectionName:
            return State.new.withKey(key).remove();
          case Target.collectionName:
            return Target.new.withKey(key).remove();
        }
      }).filter(i => !!i)
    );
  }
};

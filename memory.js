const Context = require('./model/collection/context.js');
const Event = require('./model/collection/event.js');
//const Affect = require('./models/edges/affect.js');
const Fallback = require('./model/edge/fallback.js');

module.exports = class Memory {
  constructor(context) {
    this.context = context;
  }

  async ensureMemoryBuilt() {
    await Promise.all(this.context.map(async key => {
      try {
        const context = new Context();
        context.key = key;
        return await context.create({ returnNew: false, silent: true });
      } catch (e) {
        return Promise.resolve();
      }
    }));
    const relations = [];
    this.context.forEach(context => {
      if (relations.length > 0) {
        relations[0].unshift(context);
      }
      relations.unshift([context]);
    });
    relations.shift();
    await Promise.all(relations.map(async ([fromKey, toKey]) => {
      try {
        return await Fallback
          .new
          .single
          .to(Context.new.withKey(toKey))
          .from(Context.new.withKey(fromKey))
          .create();
      } catch (e) {
        return Promise.resolve();
      }
    }));
  }
};

const Context = require('./model/collection/context.js');
const Fallback = require('./model/edge/fallback.js');

module.exports = class Memory {
  constructor(context) {
    this.context = context;
  }

  async prepare() {
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

  async emerge() {
    if (!this.context.length) {
      return {};
    }
    const sourceKey = this.context[this.context.length - 1];
    const source = Context.new.withKey(sourceKey);
    this.memoryCells = (await Fallback.buildDeepTree(source)).map(e => e.proxy);
    return new Proxy(this, {
      get: (target, name) => {
        if (target[name]) {
          return target[name];
        }
        for (const cell of target.memoryCells) {
          if (cell[name]) {
            return cell[name];
          }
        }
        return undefined;
      }
    });
  }

  async memorize(key, data) {
    const context = Context.new.with(data).withKey(key);
    this.memoryCells.unshift(context);
    return context.save();
  }
};
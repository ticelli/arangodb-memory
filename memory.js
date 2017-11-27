const Context = require('./model/collection/context.js');
const Fallback = require('./model/edge/fallback.js');

module.exports = class Memory {
  constructor(context) {
    this.context = context;
  }

  async prepare() {
    await Promise.all(this.context.map(async (key) => {
      try {
        const context = Context.new.withKey(key);
        return await context.create({ returnNew: false, silent: true });
      } catch (e) {
        return Promise.resolve();
      }
    }));
    const relations = [];
    this.context.forEach((context) => {
      if (relations.length > 0) {
        relations[0].unshift(context);
      }
      relations.unshift([context]);
    });
    relations.shift();
    await Promise.all(relations.map(async ([fromKey, toKey]) => {
      try {
        const from = Context.new.withKey(fromKey);
        const to = Context.new.withKey(toKey);
        return await Fallback
          .new
          .single
          .withKey(`${from.key}-${to.key}`)
          .to(to)
          .from(from)
          .create();
      } catch (e) {
        return Promise.resolve();
      }
    }));
  }

  async emerge(originKey) {
    if (!this.context.length) {
      return this;
    }
    if (!originKey) {
      originKey = this.context[this.context.length - 1];
    }
    const source = Context.new.withKey(originKey);
    this.memoryCells = await Fallback.buildDeepTree(source);
    return this;
  }

  get(key) {
    for (const cell of this.memoryCells) {
      if (cell._validatedContent[key]) {
        return cell._validatedContent[key];
      }
    }
    return undefined;
  }

  async memorize(key, data) {
    const context = Context.new.with(data).withKey(key);
    this.memoryCells.unshift(context);
    return context.save();
  }

  async memorizeContext(key, data) {
    const cells = this.memoryCells;
    if (!cells.length) {
      throw new Error('Memorize failed : no cells');
    }
    const context = await Context.new.replace(data).withKey(key).create();
    const to = this.memoryCells[0];
    await Fallback
      .new
      .single
      .withKey(`${key}-${to.key}`)
      .to(to)
      .from(context)
      .create();
    return context;
  }

  async forget(key) { // eslint-disable-line class-methods-use-this
    return Context.new.withKey(key).remove();
  }
};

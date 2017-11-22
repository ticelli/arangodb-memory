const AbstractRouter = require('ticelli-bot/router');
const Memory = require('./memory.js');
const ModelSetup = require('./model');

module.exports = class ArangoDBMemory extends AbstractRouter {
  constructor(config) {
    super(config);
    ModelSetup(config);
  }

  async run(req, res) {
    if (!req.memoryContext) {
      throw new Error('Middleware cannot find any memory contexts to wire up !');
    }
    const memory = new Memory((this.config.prependContext || []).concat(req.memoryContext.path));

    Object.defineProperty(req, 'memory', {
      get: () => memory,
    });
  }

  use(fn) {
    throw new Error('You cannot use something on WitAi router, excepted to be used only as middleware')
  }
};
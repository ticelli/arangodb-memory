const AbstractRouter = require('ticelli-bot/router');
const Memory = require('./memory.js');
const ModelSetup = require('./model');

module.exports = class ArangoDBMemory extends AbstractRouter {
  constructor(config) {
    super(config);
    ModelSetup(config);
  }

  async run(train) {
    if (!train.memoryContext) {
      throw new Error('Middleware cannot find any memory contexts to wire up !');
    }
    train.hang({
      memory: new Memory((this.config.prependContext || []).concat(train.memoryContext.path)),
    });
  }
};

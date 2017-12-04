const AbstractRouter = require('ticelli-bot');
const Memory = require('./memory.js');
const ModelSetup = require('./model');

module.exports = class ArangoDBMemory extends AbstractRouter {
  constructor(config) {
    super(config);
    ModelSetup(config);
  }

  async run(train) {
    train.hang({ memory: new Memory() });
    super.run(train);
  }
};

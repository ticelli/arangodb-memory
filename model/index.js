const Abstract = require('simple-arangorm/model/abstract');
const Context = require('./collection/context.js');
const Fallback = require('./edge/fallback.js');

module.exports = async ({ arangodb }) => {
  Abstract.configure(arangodb);
  await Promise.all([
    Context.setup(),
    Fallback.setup(),
  ]);
};

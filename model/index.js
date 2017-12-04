const Abstract = require('simple-arangorm/model/abstract');
const State = require('./collection/state.js');
const Fork = require('./edge/fork.js');

const list = [State, Fork];

list.forEach(i => Abstract.register(i));
module.exports = async ({ arangodb }) => {
  Abstract.configure(arangodb);
  await Promise.all([
    State.setup(),
    Fork.setup(),
  ]);
};

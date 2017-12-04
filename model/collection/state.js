const AbstractDocument = require('simple-arangorm/model/document');

module.exports = class State extends AbstractDocument {
  static get schema() {
    return null;
  }
  static lookup(possibleKey = []) {
    return this.new.withKey(possibleKey.reduce((a, b) => b, null));
  }
};

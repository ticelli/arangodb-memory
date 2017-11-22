const AbstractDocument = require('simple-arangorm/model/document');

module.exports = class Context extends AbstractDocument {
  static get schema() {
    return null;
  }
};

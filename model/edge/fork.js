const AbstractEdge = require('simple-arangorm/model/edge');

module.exports = class Fork extends AbstractEdge {
  static get schema() {
    const { Joi } = this;
    return {
      createdAt: Joi.date().iso().default(() => new Date(), 'Creation date'),
    };
  }
};

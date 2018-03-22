var _ = require('lodash');
/**
 * Check and normalize belongs_to and has_many association keys
 *
 * Ensures that a belongs_to association is an object and that a has_many association
 * is an array.
 *
 * @param {Object} context,
 * @param {Object} proto
 * @api private
 */

var Normalize = module.exports = function(context, proto) {

  this.proto = proto;

  var attributes = context.offshore.collections[context.identity].attributes || {};

  this.collections(context, attributes);
  this.models(context, attributes);
};

/**
 * Normalize Collection Attribute to Array
 *
 * @param {Object} attributes
 * @api private
 */

Normalize.prototype.collections = function(context, attributes) {
  for (var attribute in attributes) {

    // If attribute is not a collection, it doesn't need normalizing
    if (!attributes[attribute].collection) continue;

    // Sets the attribute as an array if it's not already
    if (this.proto[attribute] && !Array.isArray(this.proto[attribute])) {
      this.proto[attribute] = [this.proto[attribute]];
    }

    var collection = context.offshore.collections[attributes[attribute].collection];

    this.proto[attribute].forEach(function(coll) {
      if (_.isObject(coll) && !_.isDate(coll)) {
        coll = new collection._model(coll, {showJoins: true});
      }
    });
  }
};

/**
 * Normalize Model Attribute to Object
 *
 * @param {Object} attributes
 * @api private
 */

Normalize.prototype.models = function(context, attributes) {
  for (var attribute in attributes) {

    // If attribute is not a model, it doesn't need normalizing
    if (!attributes[attribute].model) continue;

    // Sets the attribute to the first item in the array if it's an array
    if (this.proto[attribute] && Array.isArray(this.proto[attribute])) {
      this.proto[attribute] = this.proto[attribute][0];
      if (_.isUndefined(this.proto[attribute])) {
        this.proto[attribute] = null;
      }
    }
    if (_.isObject(this.proto[attribute]) && !_.isDate(this.proto[attribute])) {
      var collection = context.offshore.collections[attributes[attribute].model];
      this.proto[attribute] = new collection._model(this.proto[attribute], {showJoins: true});
    }
  }
};

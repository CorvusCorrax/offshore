/**
 * Dynamic Queries
 *
 * Query the collection using the name of the attribute directly
 */

var _ = require('lodash');
var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var hasOwnProperty = utils.object.hasOwnProperty;

var finder = module.exports = {};

/**
 * buildDynamicFinders
 *
 * Attaches shorthand dynamic methods to the prototype for each attribute
 * in the schema.
 */

finder.buildDynamicFinders = function() {
  var self = this;

  // For each defined attribute, create a dynamic finder function
  Object.keys(this._attributes).forEach(function(attrName) {
    // Check if attribute is an association, if so generate dynamic finders
    if ((self._attributes[attrName].model && self.associationFinders === false) || self._attributes[attrName].collection) {
      return;
    }

    var capitalizedMethods = ['findOneBy*', 'findOneBy*In', 'findOneBy*Like', 'findBy*', 'findBy*In',
      'findBy*Like', 'countBy*', 'countBy*In', 'countBy*Like'];

    var lowercasedMethods = ['*StartsWith', '*Contains', '*EndsWith'];


    if (self.dynamicFinders !== false) {
      capitalizedMethods.forEach(function(method) {
        self.generateDynamicFinder(attrName, method);
      });
      lowercasedMethods.forEach(function(method) {
        self.generateDynamicFinder(attrName, method, true);
      });
    }
  });
};


/**
 * generateDynamicFinder
 *
 * Creates a dynamic method based off the schema. Used for shortcuts for various
 * methods where a criteria object can automatically be built.
 *
 * @param {String} attrName
 * @param {String} method
 * @param {Boolean} dont capitalize the attrName or do, defaults to false
 */

finder.generateDynamicFinder = function(attrName, method, dontCapitalize) {
  var self = this;
  var criteria;

  // Capitalize Attribute Name for camelCase
  var preparedAttrName = dontCapitalize ? attrName : utils.capitalize(attrName);

  // Figure out actual dynamic method name by injecting attribute name
  var actualMethodName = method.replace(/\*/g, preparedAttrName);

  // Assign this finder to the collection
  this[actualMethodName] = function dynamicMethod(value, options, cb) {

    if (typeof options === 'function') {
      cb = options;
      options = null;
    }

    options = options || {};

    var usage = utils.capitalize(self.identity) + '.' + actualMethodName + '(someValue,[options],callback)';

    if (typeof value === 'undefined') return usageError('No value specified!', usage, cb);
    if (options.where) return usageError('Cannot specify `where` option in a dynamic ' + method + '*() query!', usage, cb);

    // Build criteria query and submit it
    options.where = {};
    options.where[attrName] = value;

    switch (method) {


      ///////////////////////////////////////
      // Finders
      ///////////////////////////////////////


      case 'findOneBy*':
      case 'findOneBy*In':
        return self.findOne(options, cb);

      case 'findOneBy*Like':
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.findOne(criteria, cb);


      ///////////////////////////////////////
      // Aggregate Finders
      ///////////////////////////////////////


      case 'findBy*':
      case 'findBy*In':
        return self.find(options, cb);

      case 'findBy*Like':
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.find(criteria, cb);


      ///////////////////////////////////////
      // Count Finders
      ///////////////////////////////////////


      case 'countBy*':
      case 'countBy*In':
        return self.count(options, cb);

      case 'countBy*Like':
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.count(criteria, cb);


      ///////////////////////////////////////
      // Searchers
      ///////////////////////////////////////

      case '*StartsWith':
        return self.startsWith(options, cb);

      case '*Contains':
        return self.contains(options, cb);

      case '*EndsWith':
        return self.endsWith(options, cb);
    }
  };
};

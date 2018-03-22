
/**
 * Module dependencies
 */

var _ = require('lodash');
var Bluebird = require('bluebird');
var Model = require('./lib/model');
var defaultMethods = require('./lib/defaultMethods');
var internalMethods = require('./lib/internalMethods');

/**
 * Build Extended Model Prototype
 *
 * @param {Object} context
 * @param {Object} mixins
 * @return {Object}
 * @api public
 */

module.exports = function(context, mixins) {

  /**
   * Extend the model prototype with default instance methods
   */

  var prototypeFns = {

    _loadQuery: function(query) {
      if (query && query.transaction) {
        this.save = function(options, cb) {
          return new defaultMethods.save(context._loadQuery(query), this, options, cb);
        };
      }
      return this;
    },

    toObject: function() {
      return new defaultMethods.toObject(context, this);
    },

    toRawData: function() {
      return new defaultMethods.toRawData(context, this);
    },

    save: function(options, cb) {
      return new defaultMethods.save(context, this, options, cb);
    },

    destroy: function(cb) {
      return new defaultMethods.destroy(context, this, cb);
    },

    _defineAssociations: function() {
      new internalMethods.defineAssociations(context, this);
    },

    _normalizeAssociations: function() {
      new internalMethods.normalizeAssociations(context, this);
    },

    _cast: function(values) {
      _.keys(context._attributes).forEach(function(key) {
        var type = context._attributes[key].type;

        // Attempt to parse Array or JSON type
        if (type === 'array' || type === 'json') {
          if (!_.isString(values[key])) return;
          try {
            values[key] = JSON.parse(values[key]);
          } catch(e) {
            return;
          }
        }

        // Convert booleans back to true/false
        if (type === 'boolean') {
          var val = values[key];
          if (val === 0) values[key] = false;
          if (val === 1) values[key] = true;
        }

      });

      // remove unknown attributes
      _.keys(values).forEach(function(key) {
        if (context._attributes[key]) {
          return;
        }

        // var flag = false;
        // _.keys(context._attributes).forEach(function(key2) {
        //   var dominantKey = '';
        //   var recessiveKey = '';
        //   if (context._attributes[key2].collection && context.offshore.collections[context._attributes[key2].collection]) {
        //     var otherColl = context.offshore.collections[context._attributes[key2].collection];
        //     var otherAttrs = otherColl._attributes || otherColl.attributes;
        //     if (context._attributes[key2].dominant) {
        //       dominantKey += context.identity + '_' + otherAttrs[context._attributes[key2].via].via;
        //       recessiveKey += otherColl.identity + '_' + context._attributes[key2].via;
        //     } else {
        //       dominantKey += otherColl.identity + '_' + context._attributes[key2].via;
        //       recessiveKey += context.identity + '_' + otherAttrs[context._attributes[key2].via].via;
        //     }
        //     if (dominantKey + '__' + recessiveKey === key) {
        //       flag = true;
        //     }
        //   }
        // });
        // if (flag) {
        //   delete values[key];
        // }

        // delete values[key];
      });
    },

    /**
     * Model.validate()
     *
     * Takes the currently set attributes and validates the model
     * Shorthand for Model.validate({ attributes }, cb)
     *
     * @param {Function} callback - (err)
     * @return {Promise}
     */

    validate: function(cb) {
      // Collect current values
      var values = this.toObject();

      if (cb) {
        context.validate(values, function(err) {
          if (err) { return cb(err); }
          cb();
        });
        return;
      } else {
        return new Bluebird(function(resolve, reject) {
          context.validate(values, function(err) {
            if (err) { return reject(err); }
            resolve();
          });
        });
      }
    }

  };

  // If any of the attributes are protected, the default toJSON method should
  // remove them.
  var protectedAttributes = _.compact(_.map(context._attributes, function(attr, key) {return attr.protected ? key : undefined;}));

  prototypeFns.toJSON = function() {
    var obj = this.toObject();

    if (protectedAttributes.length) {
      _.each(protectedAttributes, function(key) {
        delete obj[key];
      });
    }

    // Remove toJSON from the result, to prevent infinite recursion with
    // msgpack or other recursive object transformation tools.
    //
    // Causes issues if set to null and will error in Sails if we delete it because blueprints call it.
    //
    // obj.toJSON = null;

    return obj;
  };

  var prototype = _.extend(prototypeFns, mixins);

  var model = Model.extend(prototype);

  // Return the extended model for use in Offshore
  return model;
};

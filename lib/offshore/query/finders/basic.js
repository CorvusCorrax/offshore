/**
 * Basic Finder Queries
 */

var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var sorter = require('../../utils/sorter');
var Deferred = require('../deferred');
var Joins = require('./joins');
var Operations = require('./operations');
var Integrator = require('../integrator');
var offshoreCriteria = require('offshore-criteria');
var _ = require('lodash');
var async = require('async');
var hasOwnProperty = utils.object.hasOwnProperty;

function groupBy( array , groupBykeys, fct) {
  var groups = {};
  array.forEach(function(item) {
    var groupValues = [];
    groupBykeys.forEach(function(key) {
      groupValues.push(item[key]);
    });
    var group = JSON.stringify(groupValues);
    groups[group] = groups[group] || [];
    groups[group].push(item);
  });
  return Object.keys(groups).map(function(group){
    return fct(groups[group]);
  });
}

module.exports = {

  /**
   * Find a single record that meets criteria
   *
   * @param {Object} criteria to search
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOne: function(criteria, cb, metaContainer) {
    var self = this;

    if (typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
    }

    // If the criteria is an array of objects, wrap it in an "or"
    if (Array.isArray(criteria) && _.every(criteria, function(crit) {return _.isObject(crit);})) {
      criteria = {or: criteria};
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    criteria = normalize.expandPK(self, criteria);

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.findOne, criteria);
    }

    // Transform Search Criteria
    criteria = self._transformer.serialize(criteria);

    // If a projection is being used, ensure that the Primary Key is included
    if(criteria.select) {
      _.each(this._schema.schema, function(val, key) {
        if (_.has(val, 'primaryKey') && val.primaryKey) {
          criteria.select.push(key);
        }
      });

      criteria.select = _.uniq(criteria.select);
    }

    // serialize populated object
    if (criteria.joins) {
      criteria.joins.forEach(function(join) {
        if (join.criteria && join.criteria.where) {
          var joinCollection = self.offshore.collections[join.child];
          join.criteria.where = joinCollection._transformer.serialize(join.criteria.where);
        }
      });
    }

    // If there was something defined in the criteria that would return no results, don't even
    // run the query and just return an empty result set.
    if (criteria === false || criteria.where === null) {
      // Build Default Error Message
      var err = '.findOne() requires a criteria. If you want the first record try .find().limit(1)';
      return cb(new Error(err));
    }

    // Build up an operations set
    var operations = new Operations(self, criteria, 'findOne', metaContainer);

    // Run the operations
    operations.run(function(err, values) {
      if (err) {
        return cb(err);
      }
      if (_.isUndefined(values)) {
        return cb();
      }
      if (_.isArray(values)) {
        values = values[0];
      }

      return cb(null, new self._model(values, {showJoins: true}));
    });
  },

  /**
   * Find All Records that meet criteria
   *
   * @param {Object} search criteria
   * @param {Object} options
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  find: function(criteria, options, cb, metaContainer) {
    var self = this;
    var usage = utils.capitalize(this.identity) + '.find([criteria],[options]).exec(callback|switchback)';

    if (typeof criteria === 'function') {
      cb = criteria;
      criteria = null;

      if(arguments.length === 1) {
        options = null;
      }
    }

    // If options is a function, we want to check for any more values before nulling
    // them out or overriding them.
    if (typeof options === 'function') {

      // If cb also exists it means there is a metaContainer value
      if (cb) {
        metaContainer = cb;
        cb = options;
        options = null;
      } else {
        cb = options;
        options = null;
      }

    }

    // If the criteria is an array of objects, wrap it in an "or"
    if (Array.isArray(criteria) && _.every(criteria, function(crit) {return _.isObject(crit);})) {
      criteria = {or: criteria};
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    criteria = normalize.expandPK(self, criteria);

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Validate Arguments
    if (typeof criteria === 'function' || typeof options === 'function') {
      return usageError('Invalid options specified!', usage, cb);
    }

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.find, criteria, options);
    }

    // If there was something defined in the criteria that would return no results, don't even
    // run the query and just return an empty result set.
    if (criteria === false) {
      return cb(null, []);
    }

    // Fold in options
    if (options === Object(options) && criteria === Object(criteria)) {
      criteria = _.extend({}, criteria, options);
    }

    // If a projection is being used, ensure that the Primary Key is included
    if(criteria.select) {
      _.each(this._schema.schema, function(val, key) {
        if (_.has(val, 'primaryKey') && val.primaryKey) {
          criteria.select.push(key);
        }
      });

      criteria.select = _.uniq(criteria.select);
    }

    // Transform Search Criteria
    if (!self._transformer) {
      throw new Error('Offshore can not access transformer-- maybe the context of the method is being overridden?');
    }

    criteria = self._transformer.serialize(criteria);

    // serialize populated object
    if (criteria.joins) {
      criteria.joins.forEach(function(join) {
        var joinCollection = self.offshore.collections[join.child];
        if (join.criteria && join.criteria.where) {
          join.criteria.where = joinCollection._transformer.serialize(join.criteria.where);
        }
        if (join.criteria && join.criteria.sort) {
          join.criteria.sort = joinCollection._transformer.serialize(join.criteria.sort);
        }
      });
    }

    // Build up an operations set
    var operations = new Operations(self, criteria, 'find', metaContainer);

    // Run the operations
    operations.run(function(err, values) {
      if (err) {
        return cb(err);
      }
      if (_.isUndefined(values)) {
        return cb(null, []);
      }
      var models = [];
      // Create a model for the top level values
      values.forEach(function(model) {
        models.push(new self._model(model, {showJoins: true})._loadQuery(self._query));
      });
      return cb(null, models);
    });
  },

  where: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },

  select: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },


  /**
   * findAll
   * [[ Deprecated! ]]
   *
   * @param  {Object}   criteria
   * @param  {Object}   options
   * @param  {Function} cb
   */
  findAll: function(criteria, options, cb) {
    if (typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
      options = null;
    }

    if (typeof options === 'function') {
      cb = options;
      options = null;
    }

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.findAll, criteria);
    }

    cb(new Error('In Offshore >= 0.9, findAll() has been deprecated in favor of find().' +
                '\nPlease visit the migration guide at http://sailsjs.org for help upgrading.'));
  }

};

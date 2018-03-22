
/**
 * Module Dependencies
 */

var _ = require('lodash');
var normalize = require('../../utils/normalize');
var asynk = require('asynk');
var DeepCursor = require('../deepCursor');

/**
 * Builds up a set of operations to perform based on search criteria.
 *
 * This allows the ability to do cross-adapter joins as well as fake joins
 * on adapters that haven't implemented the join interface yet.
 */

var Operations = module.exports = function(context, criteria, parent, metaContainer) {
  // Set context
  this.context = context;

  // Set criteria
  this.criteria = criteria;

  // Set parent
  this.parent = parent;

  this.metaContainer = metaContainer;

  this._pathOpsIndex = {};

  this.transformations = {};

  // Build Up Operations
  this.operations = this._buildOperations();
  // console.log('OPOPOP : ', JSON.stringify(this.operations, null, 2));

};


/*
 ***********************************************************************************
 * PUBLIC METHODS
 ***********************************************************************************/


/**
 * Run Operations
 *
 * Execute a set of generated operations returning an array of results that can
 * joined in-memory to build out a valid results set.
 *
 * @param {Function} cb
 * @api public
 */

Operations.prototype.run = function run(cb) {
  var self = this;

  // Grab the parent operation, it will always be the very first operation
  var parentOp = this.operations.shift();

  // Run The Parent Operation
  this._runOperation(parentOp.collection, parentOp.method, parentOp.criteria, function(err, results) {
    if (err) {
      return cb(err);
    }

    if (_.isUndefined(results) || _.isNull(results)) {
      return cb();
    }

    var unserializedModels = self._deepUnserialize(self.context.identity, results, parentOp.basePath, parentOp.transformations);

    if (self.operations.length === 0) {
      return cb(null , unserializedModels);
    }

    self.cursor = new DeepCursor(self.context.identity, unserializedModels, self.criteria.paths);
    parentOp.defer.resolve();
    asynk.when.apply(asynk, _.map(self.operations, 'defer')).asCallback(function(err) {
      if (err) {
        return cb(err);
      }
      var results = self._deepUnserialize(self.context.identity, self.cursor.getRoot(), self.context.identity, self.transformations);
      return cb(null, results);
    });
  });
};

Operations.prototype.getByPath = function(path) {
 return this._pathOpsIndex[path];
};

Operations.prototype.index = function(op) {
  var self = this;
  this._pathOpsIndex[op.basePath] = op;
  if (op.criteria.joins) {
    op.criteria.joins.forEach(function(join) {
      self._pathOpsIndex[join.path] = op;
    });
  }
};

Operations.prototype.createOperation = function(join) {
  var self = this;
  var joinCnx = self._getConnections(join);
  // create a new operation that depends on parent results
  var cnx = joinCnx[0];
  if (joinCnx.length === 2) {
    cnx = joinCnx[1];
  }
  var childOperation = {
    connection: cnx,
    collection: join.child,
    method: 'find',
    criteria: normalize.criteria(join.criteria),
    defer: asynk.deferred(),
    basePath: join.path,
    transformations: {},
    paths: {}
  };

  var parentPath = join.path.split('.').slice(0, -1).join('.');

  var alias = _.last(join.path.split('.'));
  var associations = self.criteria.paths[parentPath] && self.criteria.paths[parentPath].associations;

  if (associations && associations.collections[alias] && associations.collections[alias].through) {
    self.transformations[parentPath] = self.transformations[parentPath] || {};
    self.transformations[parentPath][associations.collections[alias].through] = null;
    console.log('PARTIAL ASSOC', self.transformations);
    parentPath += '.' + associations.collections[alias].through;
  }

  var parentOp = self.getByPath(parentPath);
  if (!parentOp) {
    throw new Error('could not find a parent operation for join: \n' + JSON.stringify(join, null, 2));
  }

  if (parentOp.criteria.joins) {
    var partialAssoc = _.find(parentOp.criteria.joins, function(parentJoin) {
      return parentJoin.alias === join.alias;
    });
    if (partialAssoc) {
      var path = join.path.split('.').slice(0, -1).join('.');
      parentOp.transformations[path] = parentOp.transformations[path] || {};
      parentOp.transformations[path][join.alias] = partialAssoc.child;
    }
  }

  parentOp.defer.done(function() {
    childOperation.criteria.where = childOperation.criteria.where || {};
    // should use deepCursor
    if (join.model) {
      var childAttributes = self.context.offshore.collections[childOperation.collection].attributes;
      var pk = _.find(_.keys(childAttributes), function(attr) {
        return childAttributes[attr].primaryKey;
      });
      childOperation.criteria.where[pk] = _.uniq(self.cursor.parents[childOperation.basePath]);
    } else {
      childOperation.criteria.where[join.childKey] = _.uniq(self.cursor.parents[parentPath]);
    }

    var childCollection = self.context.offshore.collections[childOperation.collection];
    childOperation.criteria.where = childCollection._transformer.serialize(childOperation.criteria.where);

    self._runOperation(childOperation.collection, childOperation.method, childOperation.criteria, function(err, results) {
      var unserializedModels = self._deepUnserialize(childOperation.collection, results, childOperation.basePath, childOperation.transformations);
      var pathCursor = self.cursor.getChildPath(childOperation.basePath);

      pathCursor.zip(unserializedModels);
      childOperation.defer.resolve();
    });
  });

  childOperation.paths[join.path] = join;
  self.index(childOperation);

  return childOperation;
};

Operations.prototype._buildOperations = function() {
  var self = this;

  var operations = [];

  // Check if joins were used, if not only a single operation is needed on a single connection
  if (!this.criteria.joins) {

    // Grab the collection
    var collection = this.context.offshore.collections[this.context.identity]._loadQuery(this.context._query);

    operations.push({
      connection: collection.connection[0],
      collection: this.context.identity,
      method: this.parent,
      criteria: this.criteria,
      transformations: {},
      defer: asynk.deferred()
    });

    return operations;
  }

  // build parent operation
  var nativeJoin = this.context.adapter.hasJoin();
  var nativeDeep = false; // this.context.adapter.hasDeep();

  var connectionName = this.context.connection[0];


  // Remove the joins from the criteria object
  var tmpCriteria = _.cloneDeep(this.criteria);
  delete tmpCriteria.joins;

  var parentOperation = {
    connection: connectionName,
    collection: this.context.identity,
    method: this.parent,
    criteria: tmpCriteria,
    basePath: this.context.identity,
    paths: {},
    transformations: {},
    defer: asynk.deferred()
  };
  operations.push(parentOperation);
  self.index(parentOperation);

  this.criteria.joins.forEach(function(join) {
    var parentPath = join.path.split('.').slice(0, -1).join('.');

    var alias = _.last(join.path.split('.'));
    var associations = self.criteria.paths[parentPath] && self.criteria.paths[parentPath].associations;

    if (associations && associations.collections[alias] && associations.collections[alias].through) {
      parentPath += '.' + associations.collections[alias].through;
    }

    var parentOp = self.getByPath(parentPath);
    if (!parentOp) {
      throw new Error('could not find a parent operation in path `' + parentPath + '` for join: \n' + JSON.stringify(join, null, 2));
    }

    var joinCnx = self._getConnections(join);

    if (joinCnx.length === 1 && joinCnx[0] === parentOp.connection) {
      if (nativeDeep) {
        parentOp.criteria.joins = parentOp.criteria.joins || [];
        parentOp.criteria.joins.push(join);
        parentOp.method = 'join';
        if (join.path) {
          // mettre a jour les indexs
          parentOp.paths[join.path] = join;
        }
        self.index(parentOp);
        return;
      }
      if (nativeJoin) {
        // check if operation can handle this join
        parentOp.criteria.joins = parentOp.criteria.joins || [];
        parentOp.criteria.joins.push(join);
        parentOp.method = 'join';
        self.index(parentOp);
        return;
      }
    }

    operations.push(self.createOperation(join));
  });

  return operations;
};

Operations.prototype._getConnections = function(join) {
  var connections = [];
  connections.push(this.context.offshore.collections[join.parent]._loadQuery(this.context._query).connection[0]);
  var childConnectionName = this.context.offshore.collections[join.child]._loadQuery(this.context._query).connection[0];
  if (childConnectionName !== connections[0]) {
    connections.push(childConnectionName);
  }
  return connections;
};

Operations.prototype._runOperation = function(collectionName, method, criteria, cb) {
  // Ensure the collection exist
  if (!this.context.offshore.collections[collectionName]) {
    return cb(new Error('Invalid Collection specified in operation.'));
  }

  // Find the connection object to run the operation
  var collection = this.context.offshore.collections[collectionName]._loadQuery(this.context._query);

  // Run the operation
  if (criteria && criteria.paths) {
    delete criteria.paths;
  }

  collection.adapter[method](criteria, cb, this.metaContainer);
};

Operations.prototype._deepUnserialize = function(collectionName, data, path, transformations) {
  console.log('DEEP UNSERIALIZE', transformations[path], data);
  var self = this;
  var unserializedModels = [];
  var collection = self.context.offshore.collections[collectionName];
  var attrs = _.keys(collection.attributes);
  if (data) {
    if (!_.isArray(data)) {
      return this._deepUnserialize(collectionName, [data], path, transformations)[0];
    }
    data.forEach(function(serialized) {
      serialized = _.clone(serialized);

      if (transformations[path]) {
        _.keys(transformations[path]).forEach(function(attrName) {
          if (transformations[path][attrName] === null) {
            delete serialized[attrName];
          } else {
            serialized[transformations[path][attrName]] = serialized[attrName];
            delete serialized[attrName];
          }
        });
      }

      attrs.forEach(function(attrName) {
        var attr = collection.attributes[attrName];

        // Handle columnName
        if (attr.columnName && attr.columnName !== attrName && serialized[attr.columnName]) {
          serialized[attrName] = serialized[attr.columnName];
          delete serialized[attr.columnName];
        }

        // Model flatten
        if ((attr.model || attr.foreignKey) && _.isArray(serialized[attrName])) {
          serialized[attrName] = serialized[attrName][0] || null;
        }

        // Model recursion
        if (attr.model && _.isObject(serialized[attrName])) {
          serialized[attrName] = self._deepUnserialize(attr.model, [serialized[attrName]], path + '.' + attrName, transformations)[0];
        }

        // Junction recursion
        if (attr.foreignKey && _.isObject(serialized[attrName])) {
          serialized[attrName] = self._deepUnserialize(attr.references, [serialized[attrName]], path + '.' + attr.references, transformations)[0];
        }

        // Collection recursion
        if (attr.collection && _.isArray(serialized[attrName])) {
          serialized[attrName] = self._deepUnserialize(attr.collection, serialized[attrName], path + '.' + attrName, transformations);
        }

      });
      unserializedModels.push(serialized);
    });
  }

  return unserializedModels;
};

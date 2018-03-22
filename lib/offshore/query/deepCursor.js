/**
*
*         ROOT LEVEL
*      +--------------+
*      | ADAPTER EXEC |
*      +------+-------+
*             v
*      +--------------+
*      |  PARENTS     |
*      +--------------+   INDEX REFERENCES
*      |  CHILDREENS  +-------+ BY PATH/PK
*      +--------------+       |
*                             |
*       GET LEVEL n           v CURSOR
*       PARENTS PK       +----+----+
*       BY    +----------+  INDEX  |
*       PATH  |          +----+----+
*             v               ^
*      +------+-------+       |
*      | ADAPTER EXEC |       |
*      +------+-------+       |
*             v               |
*      +--------------+       |
*      |  PARENTS     |       |
*      +--------------|-------+
*      |  CHILDREENS  |  MERGE PARENTS IN REFERENCES
*      +--------------+              AND
*                        INDEX CHILDREENS BY PATH/PK
*
*/


var _ = require('lodash');

var DeepCursor = module.exports = function(path, data, paths) {
  this.path = path;
  this.paths = paths;

  if (data) {
    this.root = data;
    this.parents = {};
    this.deepIndex(this.root, path);
  }
};

DeepCursor.prototype.deepIndex = function(data, path) {
  var self = this;
  if (!_.isArray(data)) {
    data = [data];
  }
  var associations = self.paths[path].associations;
  data.forEach(function(parent) {
    _.keys(associations.collections).forEach(function(associationName) {
      var pk = associations.collections[associationName].primaryKey;
      var childPath = path + '.' + associationName;
      if (_.isUndefined(parent[associationName])) {
        return;
      }
      parent[associationName].forEach(function(child) {
        if (_.isUndefined(child)) {
          return;
        }
        if (_.isObject(child)) {
          self.index(childPath, child[pk], child);
          if (self.paths[childPath]) {
            self.deepIndex(child, childPath);
          }
          return;
        }
      });
    });

    _.keys(associations.models).forEach(function(associationName) {
      var pk = associations.models[associationName].primaryKey;
      var childPath = path + '.' + associationName;
      var pkVal = parent[associationName];
      if (_.isObject(pkVal)) {
        pkVal = parent[associationName][pk];
      } else {
        parent[associationName] = {};
      }
      self.index(childPath, pkVal, parent[associationName]);
    });
  });
};

DeepCursor.prototype.index = function(path, pk, dest) {
  if (!this.paths[path]) {
    this.paths[path] = {};
  }
  if (!this.paths[path].refs) {
    this.paths[path].refs = {};
  }

  if (_.isUndefined(this.paths[path].refs[pk])) {
    this.paths[path].refs[pk] = [dest];
  } else {
    this.paths[path].refs[pk].push(dest);
  }

  // add to path parents
  if (!this.parents[path]) {
    this.parents[path] = [];
  }
  this.parents[path].push(pk);
};

DeepCursor.prototype.extend = function(pk, object) {
  this.paths[this.path].refs[pk][0] = _.extend(this.paths[this.path].refs[pk][0], object);
};

DeepCursor.prototype.zip = function(data) {
  var self = this;
  var currentAlias = this.path.substring(this.path.lastIndexOf('.') + 1, this.path.length);
  var previousPath = this.path.split('.').slice(0, -1).join('.');
  var associations = this.paths[previousPath].associations;
  var association = associations.collections[currentAlias] || associations.models[currentAlias];
  var operations = {};


  if (!Array.isArray(data)) {
    data = [data];
  }
  for (var iterator in data) {
    var model = data[iterator];
    var pkVal = model[association.primaryKey];


    _.keys(this.paths[this.path].associations.models).forEach(function(assocName) {
      if (!_.isObject(model[assocName])) {
        return;
      }
      var assoc = self.paths[self.path].associations.models[assocName];
      operations[self.path + '.' + assocName] = operations[self.path + '.' + assocName] || {};
      var pk = model[assoc.primaryKey];
      operations[self.path + '.' + assocName][pk] = model[assocName];
    });

    _.keys(this.paths[this.path].associations.collections).forEach(function(assocName) {
      if (!_.isArray(model[assocName]) || !model[assocName].length) {
        return;
      }
      operations[self.path + '.' + assocName] = operations[self.path + '.' + assocName] || {};
      operations[self.path + '.' + assocName][pkVal] = model[assocName];
    });

    // Check if current model is a parent collection association
    if (associations.collections[currentAlias]) {
      // push current path model data in previous path parent[child] array
      var through = associations.collections[currentAlias].through;

      var previousModels;

      if (through) {
        if (!this.paths[previousPath + '.' + through].refs) {
          console.log('NO REFS THROUGH : ', previousPath + '.' + through, JSON.stringify(this.paths[previousPath + '.' + through], null, 2));
        }
        previousModels = this.paths[previousPath + '.' + through].refs[pkVal];
      } else {
        if (_.isObject(pkVal)) {
          var modelName = _.find(_.keys(this.paths[this.path].associations.models), function(key) {
            var assoc = self.paths[self.path].associations.models[key] || {};
            return assoc.via === association.primaryKey;
          });
          var pk = this.paths[this.path].associations.models[modelName].primaryKey;
          pkVal = model[association.primaryKey][pk];
        }

        if (_.isObject(model[association.primaryKey])) {
          operations[previousPath + '.' + modelName] = operations[previousPath + '.' + modelName] || {};
          operations[previousPath + '.' + modelName][pkVal] = model[association.primaryKey];
        }

        var via = associations.collections[currentAlias].via;
        var previousPkVal = model[via];
        if (!this.paths[previousPath].refs) {
          console.log('NO REFS THROUGH : ', previousPath + ' ' + previousPkVal, JSON.stringify(this.paths[previousPath], null, 2));
        }
        previousModels = this.paths[previousPath].refs[previousPkVal];
      }

      previousModels.forEach(function(previousModel) {
        if (through) {
          var parentPk = previousModel[associations.collections[through].via];

          self.paths[previousPath].refs[parentPk].forEach(function(parent) {
            parent[currentAlias] = parent[currentAlias] || [];
            parent[currentAlias].push(model);
          });
          return;
        }


        previousModel[currentAlias] = previousModel[currentAlias] || [];

        previousModel[currentAlias].push(model);
      });
      self.index(self.path, pkVal, model);

    } else {
      // extend current path model data in previous path parent[child]
      self.extend(pkVal, model);
    }
  }

  // index populated data
  _.keys(operations).forEach(function(path) {
    var data = [];
    _.keys(operations[path]).forEach(function(key) {
      if (_.isArray(operations[path][key])) {
        data = data.concat(operations[path][key]);
      } else {
        data.push(operations[path][key]);
      }
    });
    if (data.length) {
      self.getChildPath(path).zip(data);
    }
  });

};

DeepCursor.prototype.getParents = function() {
  return this.parents[this.path];
};

DeepCursor.prototype.getChildPath = function(path) {
  var pathCursor = new DeepCursor(path);
  pathCursor.paths = this.paths;
  pathCursor.parents = this.parents;
  pathCursor.root = this.root;
  return pathCursor;
};

DeepCursor.prototype.getRoot = function() {
  return this.root;
};

/**
 *                    CURSOR
 *         +------------|-----------------+
 *        /  ROOT LEVEL v                  \
 *       +/\/ /\/ /\/####HHH/ /\/ /\/ /\/ /\+
 *      /-MERGED-----###c***O)               \
 *     +/\ \/\ \/\ \/####HHH -----------------+
 *    /  INDEXED     LEVEL n ZIPING PATH --->
 *   +/\ \/\ \/\ \/\ \/\ \/\ -------------------+
 *
 */

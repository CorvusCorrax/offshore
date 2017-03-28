var _ = require('lodash');
var async = require('async');

module.exports = function(models, cb) {
  var self = this;
  var transactionCnx = {};
  models = _.isArray(models) ? models : [models];
  models.forEach(function(model) {
    _.keys(model.adapter.dictionary).forEach(function(fct) {
      var cnx = model.adapter.dictionary[fct];

      if(!transactionCnx[cnx]) {
        transactionCnx[cnx] = {collections: {}, adapter: model.offshore.connections[cnx]._adapter, context: model.offshore};
      }
      if(!transactionCnx[cnx].collections[model.identity]) {
        transactionCnx[cnx].collections[model.identity] = [];
      }
      transactionCnx[cnx].collections[model.identity].push(fct);
    });
  });

  var transactionDeferred = new TransactionDeferred(transactionCnx);
  var transactionDictionary = {};
  async.eachSeries(_.keys(transactionCnx), function(cnx, cb) {
    if(!transactionCnx[cnx].adapter.registerTransaction) {
      return cb('Adapter does not support transactions');
    }
    transactionCnx[cnx].adapter.registerTransaction(cnx, _.keys(transactionCnx[cnx].collections), function(err, id) {
      if(err) {
        return cb(err);
      }
      transactionDictionary[cnx] = id;
      transactionCnx[cnx].id = id;
      cb();
    });
  }, function(err) {
    if(err) {
      return transactionDeferred.rollback(err);
    }
    var transaction = {};
    _.keys(transactionCnx).forEach(function(cnx) {
      var connection = transactionCnx[cnx];
      _.keys(connection.collections).forEach(function(col) {
        transaction[col] = connection.context.collections[col]._loadQuery({transaction:  transactionDictionary});
      });
    });
    cb(transaction, function(err, result) {
      if(err) {
        return transactionDeferred.rollback(err);
      }
      transactionDeferred.commit(result);

    });
  });
  return transactionDeferred;
};

var TransactionDeferred = function(connections) {
  this._connections = connections;
  this._commit = null;
  this._rollback = null;
  this._execCallback = null;
};

TransactionDeferred.prototype.commit = function(result) {
  var self = this;
  if(self._rollback) {
    throw new Error('Cannot commit when transaction has been rollbacked');
  }
  if(self._commit) {
    throw new Error('Transaction already commited');
  }
  this._commit = result;

  async.eachSeries(_.keys(self._connections), function(cnx, next) {
    self._connections[cnx].adapter.commit(self._connections[cnx].id, _.keys(self._connections[cnx].collections), next);
  }, function() {
    if(self._execCallback) {
      self._execCallback(null, self._commit);
    }
  });
};

TransactionDeferred.prototype.rollback = function(err) {
  var self = this;
  if(self._commit) {
    throw new Error('Cannot rollback when transaction has been commited');
  }
  if(self._rollback) {
    throw new Error('Transaction already rollbacked');
  }
  this._rollback = err;
  async.eachSeries(_.keys(self._connections), function(cnx, next) {
    if(!self._connections[cnx].adapter.rollback) {
      throw new Error('Adapter ' + self._connections[cnx].adapter.identity + ' doesn\'t seems to support transactions');
    }
    self._connections[cnx].adapter.rollback(self._connections[cnx].id, _.keys(self._connections[cnx].collections), next);
  }, function() {
    if(self._execCallback) {
      self._execCallback(self._rollback);
    }
  });
};

TransactionDeferred.prototype.exec = function(cb) {
  this._execCallback = cb;
};

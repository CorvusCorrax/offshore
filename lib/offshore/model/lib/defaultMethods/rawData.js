/**
 * Module dependencies
 */

var _ = require('lodash');

var toRawData = module.exports = function(context, proto) {

  var self = this;

  this.context = context;
  this.proto = proto;

  // Create an object that can hold the values to be returned
  this.object = {};

  _.keys(self.context._attributes).forEach(function(attrName) {
    var attr = self.context._attributes[attrName];
    if (_.isFunction(attr)) {
      return;
    }
    if (attr.model && _.isObject(self.proto[attrName])) {
      return self.object[attrName] = self.proto[attrName].toRawData();
    }
    if (attr.collection && _.isArray(self.proto[attrName])) {
      self.object[attrName] = [];
      self.proto[attrName].forEach(function(item) {
        self.object[attrName].push(item.toRawData());
      });
      return;
    }
    self.object[attrName] = self.proto[attrName];
  });

  return this.object;
};

var Offshore = require('../../../lib/offshore');
var assert = require('assert');

describe('Collection Query', function() {

  describe('.cache()', function() {

    describe('default filesystem cache', function() {
      var query;

      before(function(done) {

        var offshore = new Offshore();
        var Model = Offshore.Collection.extend({
          identity: 'random',
          connection: 'foo',
          attributes: {
            number: {
              type: 'integer',
              defaultsTo: 1
            },
            doSomething: function() {
            }
          }
        });

        offshore.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) {
            return cb(null, [{number: Math.random() * 10000000000000000}]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        offshore.initialize({adapters: {foobar: adapterDef}, connections: connections, cache: {prefix: 'test_cache_', defaultCacheTime: 10000}}, function(err, colls) {
          if (err)
            return done(err);
          query = colls.collections.random;
          done();
        });
      });

      it('should cache results using user defined cacheKey and cacheTime', function(done) {
        query.find({}).cache('cache_test', 10, function(err, first_values) {
          assert.ifError(err);
          setTimeout(function() {
            query.find({}).cache('cache_test', 10, function(err, cached_values) {
              assert.ifError(err);
              assert.equal(first_values[0].number, cached_values[0].number);
              done();
            });
          }, 500);
        });
      });

      it('should cache results using user defined cacheTime and automatic cacheKey', function(done) {
        var criteria = {number: [1, 2]};
        query.find(criteria).cache(10, function(err, first_values) {
          assert.ifError(err);
          setTimeout(function() {
            query.find(criteria).cache(10, function(err, cached_values) {
              assert.ifError(err);
              assert.equal(first_values[0].number, cached_values[0].number);
              done();
            });
          }, 500);
        });
      });

      it('should cache results with only a callback given', function(done) {
        var criteria = {number: 100};
        query.find(criteria).cache(function(err, first_values) {
          assert.ifError(err);
          setTimeout(function() {
            query.find(criteria).cache(function(err, cached_values) {
              assert.ifError(err);
              assert.equal(first_values[0].number, cached_values[0].number);
              done();
            });
          }, 500);
        });
      });

    });
    describe('custom adapter cache', function() {
      var query;

      before(function(done) {

        var offshore = new Offshore();
        var Model = Offshore.Collection.extend({
          identity: 'random',
          connection: 'foo',
          attributes: {
            number: {
              type: 'integer',
              defaultsTo: 1
            },
            doSomething: function() {
            }
          }
        });

        offshore.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) {
            return cb(null, [{number: Math.random() * 10000000000000000}]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        offshore.initialize({adapters: {foobar: adapterDef}, connections: connections, cache: {prefix: 'test_cache_', defaultCacheTime: 10000, adapter: require('offshore-memory')}}, function(err, colls) {
          if (err)
            return done(err);
          query = colls.collections.random;
          done();
        });
      });

      it('should cache results using user defined cacheKey and cacheTime', function(done) {
        query.find({}).cache('cache_test', 600, function(err, first_values) {
          assert.ifError(err);
          setTimeout(function() {
            query.find({}).cache('cache_test', 600, function(err, cached_values) {
              assert.ifError(err);
              assert.equal(first_values[0].number, cached_values[0].number);
              done();
            });
          }, 500);
        });
      });

      it('should cache results using user defined cacheTime and automatic cacheKey', function(done) {
        var criteria = {number: [1, 2]};
        query.find(criteria).cache(600, function(err, first_values) {
          assert.ifError(err);
          setTimeout(function() {
            query.find(criteria).cache(600, function(err, cached_values) {
              assert.ifError(err);
              assert.equal(first_values[0].number, cached_values[0].number);
              done();
            });
          }, 500);
        });
      });

      it('should cache results with only a callback given', function(done) {
        var criteria = {number: 100};
        query.find(criteria).cache(function(err, first_values) {
          assert.ifError(err);
          setTimeout(function() {
            query.find(criteria).cache(function(err, cached_values) {
              assert.ifError(err);
              assert.equal(first_values[0].number, cached_values[0].number);
              done();
            });
          }, 500);
        });
      });

    });
  });
});

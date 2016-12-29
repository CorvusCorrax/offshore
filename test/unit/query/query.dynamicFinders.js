var Offshore = require('../../../lib/offshore'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('dynamicFinders', function() {

    describe('configuration', function() {
      var collections;

      before(function (done) {

        var offshore = new Offshore();
        var User = Offshore.Collection.extend({
          identity: 'user',
          connection: 'foo',
          associationFinders: false,
          attributes: {
            name: 'string',
            group: {
              model: 'group'
            }
          }
        });

        var Group = Offshore.Collection.extend({
          identity: 'group',
          connection: 'foo',
          dynamicFinders: false,
          attributes: {
            name: 'string'
          }
        });

        offshore.loadCollection(User);
        offshore.loadCollection(Group);

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        offshore.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, orm) {
          if (err) return done(err);

          collections = orm.collections;
          done();
        });
      });

      it('can disable dynamicFinders', function () {
        assert(typeof collections.group.findOneByName === 'undefined');
      });
      it('can disable associationFinders', function () {
        assert(typeof collections.user.findByName === 'function');
        assert(typeof collections.user.findByGroupIn === 'undefined');
      });

    });

    describe('usage', function () {
      var query;

      before(function(done) {

        var offshore = new Offshore();
        var User = Offshore.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: 'string',
            group: {
              model: 'group'
            }
          }
        });

        var Group = Offshore.Collection.extend({
          identity: 'group',
          connection: 'foo',
          attributes: {
            name: 'string'
          }
        });

        offshore.loadCollection(User);
        offshore.loadCollection(Group);

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        offshore.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should add dynamic finder functions', function() {
        assert(typeof query.findOneByName === 'function');
        assert(typeof query.findOneByNameIn === 'function');
        assert(typeof query.findOneByNameLike === 'function');
        assert(typeof query.findByName === 'function');
        assert(typeof query.findByNameIn === 'function');
        assert(typeof query.findByNameLike === 'function');
        assert(typeof query.countByName === 'function');
        assert(typeof query.countByNameIn === 'function');
        assert(typeof query.countByNameLike === 'function');
        assert(typeof query.nameStartsWith === 'function');
        assert(typeof query.nameEndsWith === 'function');
        assert(typeof query.nameContains === 'function');
      });

      it.skip('should create dynamic finders for has_one and belongs_to associations', function() {
        assert(typeof query.findByGroup === 'function');
        assert(typeof query.findOneByGroup === 'function');
        assert(typeof query.findOneByGroupIn === 'function');
        assert(typeof query.findOneByGroupLike === 'function');
        assert(typeof query.findByGroupIn === 'function');
        assert(typeof query.findByGroupLike === 'function');
        assert(typeof query.countByGroup === 'function');
        assert(typeof query.countByGroupIn === 'function');
        assert(typeof query.countByGroupLike === 'function');
        assert(typeof query.groupStartsWith === 'function');
        assert(typeof query.groupEndsWith === 'function');
        assert(typeof query.groupContains === 'function');
      });

    });
  });
});

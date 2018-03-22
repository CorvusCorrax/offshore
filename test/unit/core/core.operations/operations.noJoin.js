var Offshore = require('../../../../lib/offshore');
var assert = require('assert');
var sinon = require('sinon');
var fixture = require('./fixture');
var _ = require('lodash');

describe('Operations', function() {

  var noJoinFindSpy;
  var findSpy;
  var joinSpy;

  before(function(done) {
    fixture.init(function(err) {
      if (err) {
        return done(err);
      }
      noJoinFindSpy = sinon.spy(fixture.adapters.noJoin, 'find');
      findSpy = sinon.spy(fixture.adapters.join, 'find');
      joinSpy = sinon.spy(fixture.adapters.join, 'join');
      done();
    });
  });

  after(function(done) {
    fixture.teardown(done);
  });


  describe('Single Connection', function() {
    describe('adapter without native join', function() {
      var person;

      before(function(done) {
        var offshore = new Offshore();
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Person));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Cat));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Flea));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Toy));
        offshore.initialize({ adapters: { foobar: fixture.adapters.noJoin }, connections: fixture.connections }, function(err, colls) {
          if (err) {
            return done(err);
          }
          person = colls.collections.person;
          done();
        });
      });

      it('should create one operation per model', function(done) {
        person.find({sort: 'age'}).populate('cat.fleas').populate('cat.toys', {sort: 'id'}).exec(function(err, results) {
          if (err) {
            return done(err);
          }
          assert(noJoinFindSpy.calledWith('foo', 'person'));
          assert(noJoinFindSpy.calledWith('foo', 'cat'));
          assert(noJoinFindSpy.calledWith('foo', 'flea'));
          assert(noJoinFindSpy.calledWith('foo', 'cat_toys__toy_cats'));
          assert(noJoinFindSpy.calledWith('foo', 'toy'));
          assert.equal(noJoinFindSpy.callCount, 5);
          noJoinFindSpy.reset();
          assert.deepEqual(sortObject(results), sortObject(fixture.data));
          done();
        });
      });
    });

    describe('adapter with native join', function() {
      var person;

      before(function(done) {
        var offshore = new Offshore();
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Person));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Cat));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Flea));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Toy));
        offshore.initialize({ adapters: { foobar: fixture.adapters.join }, connections: fixture.connections }, function(err, colls) {
          if(err) return done(err);
          person = colls.collections.person;
          done();
        });
      });

      it('should create one operation every two deep level', function(done) {
        person.find({sort: 'age'}).populate('cat.fleas').populate('cat.toys', {sort: 'id'}).exec(function(err, results) {
          if (err) {
            return done(err);
          }
          console.log('BARBEROUSSE : ', JSON.stringify(results, null, 2));
          assert(joinSpy.calledWith('foo', 'person'));
          assert(findSpy.calledWith('foo', 'flea'));
          assert(joinSpy.calledWith('foo', 'cat_toys__toy_cats'));
          assert.equal(joinSpy.callCount, 2);
          assert.equal(findSpy.callCount, 1);
          joinSpy.reset();
          findSpy.reset();
          assert.deepEqual(sortObject(results), sortObject(fixture.data));
          done();
        });
      });
    });
  });

  describe('Multiple Connections', function() {
    describe('adapter without native join', function() {
      var person;

      before(function(done) {
        // set second deep level model in a second connection
        fixture.collections.Cat.connection = 'bar';
        fixture.collections.Toy.connection = 'bar';
        fixture.reset(function(err) {
          if (err) {
            return done(err);
          }
          noJoinFindSpy = sinon.spy(fixture.adapters.noJoin, 'find');
          findSpy = sinon.spy(fixture.adapters.join, 'find');
          joinSpy = sinon.spy(fixture.adapters.join, 'join');

          var offshore = new Offshore();
          offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Person));
          offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Cat));
          offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Flea));
          offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Toy));
          offshore.initialize({ adapters: { foobar: fixture.adapters.noJoin }, connections: fixture.connections }, function(err, colls) {
            if (err) {
              return done(err);
            }
            person = colls.collections.person;
            done();
          });
        });
      });

      it('should create one operation per model', function(done) {
        person.find({sort: 'age'}).populate('cat.fleas').populate('cat.toys', {sort: 'id'}).exec(function(err, results) {
          if (err) {
            return done(err);
          }
          assert(noJoinFindSpy.calledWith('foo', 'person'));
          assert(noJoinFindSpy.calledWith('bar', 'cat'));
          assert(noJoinFindSpy.calledWith('foo', 'flea'));
          assert(noJoinFindSpy.calledWith('bar', 'cat_toys__toy_cats'));
          assert(noJoinFindSpy.calledWith('bar', 'toy'));
          assert.equal(noJoinFindSpy.callCount, 5);
          noJoinFindSpy.reset();
          assert.deepEqual(sortObject(results), sortObject(fixture.data));
          done();
        });
      });
    });

    describe('adapter with native join', function() {
      var person;

      before(function(done) {
        // set second deep level model in a second connection
        fixture.collections.Cat.connection = 'bar';
        fixture.collections.Toy.connection = 'bar';
        var offshore = new Offshore();
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Person));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Cat));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Flea));
        offshore.loadCollection(Offshore.Collection.extend(fixture.collections.Toy));
        offshore.initialize({ adapters: { foobar: fixture.adapters.join }, connections: fixture.connections }, function(err, colls) {
          if (err) {
            return done(err);
          }
          person = colls.collections.person;
          done();
        });
      });

      it('should create one operation per cross-connection relation', function(done) {
        person.find({sort: 'age'}).populate('cat.fleas').populate('cat.toys', {sort: 'id'}).exec(function(err, results) {
          if (err) {
            return done(err);
          }
          assert(findSpy.calledWith('foo', 'person'));
          assert(joinSpy.calledWith('bar', 'cat'));
          assert(findSpy.calledWith('foo', 'flea'));
          assert(findSpy.calledWith('bar', 'toy'));
          assert.equal(findSpy.callCount, 3);
          assert.equal(joinSpy.callCount, 1);
          findSpy.reset();
          assert.deepEqual(sortObject(results), sortObject(fixture.data));
          done();
        });
      });


    });
  });
});


function sortObject(object) {

  if (_.isArray(object)) {
    var sortedArray = [];
    object.forEach(function(item, i) {
      sortedArray[i] = sortObject(item);
    });
    return sortedArray;
  }

  var sortedObj = {};
  var keys = _.keys(object);

  keys = _.sortBy(keys, function(key) {
    return key;
  });

  _.each(keys, function(key) {
    if (_.isObject(object[key])) {
      sortedObj[key] = sortObject(object[key]);
    } else {
      sortedObj[key] = object[key];
    }
  });

  return sortedObj;
}

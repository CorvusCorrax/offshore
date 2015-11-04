var Offshore = require('../../../lib/offshore'),
    assert = require('assert');

describe('Model', function() {
  describe('.destroy()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var collection;

    before(function(done) {
      var offshore = new Offshore();
      var Collection = Offshore.Collection.extend({
        connection: 'my_foo',
        tableName: 'person',
        attributes: {
          first_name: 'string',
          last_name: 'string',
          full_name: function() {
            return this.first_name + ' ' + this.last_name;
          }
        }
      });

      offshore.loadCollection(Collection);

      var adapterDef = { destroy: function(con, col, options, cb) { return cb(null, true); }};

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      offshore.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        collection = colls.collections.person;
        done();
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass status from the adapter destroy method', function(done) {
      var person = new collection._model({ id: 1, first_name: 'foo', last_name: 'bar' });

      person.destroy(function(err, status) {
        assert(!err);
        assert(status === true);
        done();
      });
    });

  });
});

var structure = require('./context.fixture');

/**
 * Context Fixture for a Many To Many Relationship
 */

module.exports = function() {
  var context = structure;

  context.identity = 'foo';

  context.primaryKey = 'id';

  context.connections = {
    my_foo: {
      config: {},
      _adapter: {},
      _collections: []
    }
  };


  // Build Out Model Definitions
  var models = {
    foo: {
      identity: 'foo',
      _model: function(foo) {
        return foo;
      },
      connection: 'my_foo',
      attributes: {
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        },
        name: {
          type: 'string'
        },
        bars: {
          collection: 'bar',
          via: 'foos',
          dominant: true
        },
        foobars: {
          collection: 'baz' ,
          via: 'foo',
          dominant: true
        }
      }
    },
    bar: {
      identity: 'bar',
      _model: function(bar) {
        return bar;
      },
      connection: 'my_foo',
      attributes: {
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        },
        name: {
          type: 'string'
        },
        foos: {
          collection: 'foo',
          via: 'bars'
        }
      }
    },
    baz: {
      identity: 'baz',
      connection: 'my_foo',
      attributes: {
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        },
        foo: {
          model: 'foo'
        }
      }
    },
    bar_foos__foo_bars: {
      identity: 'bar_foos__foo_bars',
      connection: 'my_foo',
      tables: ['bar', 'foo'],
      junctionTable: true,

      attributes: {
        id: {
          primaryKey: true,
          autoIncrement: true,
          type: 'integer'
        },
        bar_foos: {
          columnName: 'bar_foos',
          type: 'integer',
          foreignKey: true,
          references: 'bar',
          on: 'id',
          via: 'foo_bars',
          groupBy: 'bar'
        },

        foo_bars: {
          columnName: 'foo_bars',
          type: 'integer',
          foreignKey: true,
          references: 'foo',
          on: 'id',
          via: 'bar_foos',
          groupBy: 'foo'
        }
      }
    }
  };


  // Set context collections
  context.offshore.collections = models;

  // Set collection attributes
  context._attributes = models.foo.attributes;
  context.attributes = context._attributes;
  context.offshore.connections = context.connections;

  // Build Up Offshore Schema
  context.offshore.schema.foo = {
    identity: 'foo',
    connection: 'my_foo',
    attributes: {
      id: {
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
        unique: true
      },
      name: {
        type: 'string'
      },

      bars: {
        collection: 'bar_foos__foo_bars',
        references: 'bar_foos__foo_bars',
        on: 'bar_foos'
      },

      foobars: {
        collection: 'baz',
        references: 'baz',
        on: 'foo_id'
      }
    }
  };

  context.offshore.schema.bar = {
    identity: 'bar',
    connection: 'my_foo',
    attributes: {
      id: {
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
        unique: true
      },
      name: {
        type: 'string'
      },
      foos: {
        collection: 'bar_foos__foo_bars',
        references: 'bar_foos__foo_bars',
        on: 'foo_bars'
      }
    }
  };

  context.offshore.schema.baz = {
    identity: 'baz',
    connection: 'my_foo',
    attributes: {
      id: {
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
        unique: true
      },
      foo: {
        columnName: 'foo_id',
        type: 'integer',
        foreignKey: true,
        references: 'foo',
        on: 'id'
      }
    }
  };

  context.offshore.schema.bar_foos__foo_bars = {
    identity: 'bar_foos__foo_bars',
    connection: 'my_foo',
    tables: ['bar', 'foo'],
    junctionTable: true,

    attributes: {
      id: {
        primaryKey: true,
        autoIncrement: true,
        type: 'integer'
      },
      bar_foos: {
        columnName: 'bar_foos',
        type: 'integer',
        foreignKey: true,
        references: 'bar',
        on: 'id',
        via: 'foo_bars',
        groupBy: 'bar'
      },

      foo_bars: {
        columnName: 'foo_bars',
        type: 'integer',
        foreignKey: true,
        references: 'foo',
        on: 'id',
        via: 'bar_foos',
        groupBy: 'foo'
      }
    }
  };

  return context;
};

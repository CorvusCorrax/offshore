var memory = require('offshore-memory');
var Offshore = require('../../../../lib/offshore');

var data = [
  {
    first_name: "pierre",
    age: 25,
    cat: {
      surname: "tobby",
      age: 10,
      fleas: [
        {
          id: 1,
          color: "blue",
          cat: "tobby"
        },
        {
          id: 2,
          color: "red",
          cat: "tobby"
        },
        {
          id: 3,
          color: "green",
          cat: "tobby"
        }
      ],
      toys: [
        {
          id: 1,
          name: 'ball'
        },
        {
          id: 2,
          name: 'yarn'
        }
      ]
    }
  },
  {
    first_name: "paul",
    age: 50,
    cat: {
      surname: "minou",
      age: 4,
      fleas: [
        {
          id: 4,
          color: "brown",
          cat: "minou"
        },
        {
          id: 5,
          color: "pink",
          cat: "minou"
        }
      ],
      toys: [
        {
          id: 2,
          name: 'yarn'
        },
        {
          id: 3,
          name: 'feather'
        }
      ]
    }
  },
  {
    first_name: "jacque",
    age: 70,
    cat: {
      surname: "chaton",
      age: 1,
      fleas: [],
      toys: []
    }
  }
];

var Person = {
  identity: 'person',
  connection: 'foo',
  migrate: 'safe',
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    first_name: {
      type: 'string',
      columnName: 'FIRSTNAME',
      primaryKey: true
    },
    age: {
      type: 'integer',
      columnName: 'AGE'
    },
    cat: {
      model: 'cat',
      columnName: 'CAT'
    }
  }
};

var Cat = {
  identity: 'cat',
  connection: 'foo',
  migrate: 'safe',
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    surname: {
      type: 'string',
      columnName: 'SURNAME',
      primaryKey: true
    },
    age: {
      type: 'integer',
      columnName: 'AGE'
    },
    fleas: {
      collection: 'flea',
      via: 'cat'
    },
    toys: {
      collection: 'toy',
      via: 'cats',
      dominant: true
    }
  }
};

var Toy = {
  identity: 'toy',
  connection: 'foo',
  migrate: 'safe',
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    id: {
      type: 'integer',
      columnName: 'ID',
      primaryKey: true
    },
    name: {
      type: 'string',
      columnName: 'NAME'
    },
    cats: {
      collection: 'cat',
      via: 'toys'
    }
  }
};

var Flea = {
  identity: 'flea',
  connection: 'foo',
  migrate: 'safe',
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    id: {
      type: 'integer',
      columnName: 'ID',
      primaryKey: true,
      autoIncrement: true
    },
    color: {
      type: 'string',
      columnName: 'COLOR'
    },
    cat: {
      model: 'cat',
      columnName: 'CAT'
    }
  }
};

var connections = {
  'foo': {
    adapter: 'foobar'
  },
  'bar': {
    adapter: 'foobar'
  }
};

module.exports = {
  init: function(cb) {
    var self = this;
    this.offshore = new Offshore();
    this.offshore.loadCollection(Offshore.Collection.extend(Person));
    this.offshore.loadCollection(Offshore.Collection.extend(Cat));
    this.offshore.loadCollection(Offshore.Collection.extend(Flea));
    this.offshore.loadCollection(Offshore.Collection.extend(Toy));

    this.offshore.initialize({ adapters: { foobar: memory }, connections: connections }, function(err, colls) {
      if (err) {
        return cb(err);
      }

      colls.collections.person.create(data, function(err, res) {
        if (err) {
          return cb(err);
        }

        self.adapters = {
          noJoin: {
            find: memory.find.bind(memory)
          },
          join: {
            find: memory.find.bind(memory),
            join: memory.join.bind(memory)
          }
        };
        self.connections = connections;
        self.collections = {
          Person: Person,
          Cat: Cat,
          Flea: Flea,
          Toy: Toy
        };
        self.data = data;
        cb();
      });
    });
  },
  teardown: function(cb) {
    this.offshore.teardown(cb);
  },
  reset: function(cb) {
    var self = this;
    this.teardown(function() {
      self.init(cb);
    });
  }
};

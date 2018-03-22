/**************************************************************************
 *                                                                        *
 *               1+-------------------+1                                  *
 *       +--------+     Company       +--------+                          *
 *      *|        +-------------------+        |*                         *
 *  +----------+      +----------+       +---------+ +     +-----------+  *
 *  |  Driver  +------+   Ride   +-------+   Taxi    +-----+ BreakDown |  *
 *  +----------+1    *+----------+*     1+---------+ +1   *+-----------+  *
 *      1|                                    *|                          *
 *      1|                                    1|                          *
 *  +----------+      +----------+       +-----------+     +-----------+  *
 *  | Address  |      |Department+-------+Constructor+-----+  country  |  *
 *  +----------+      +----------+*     1+-----------+*   *+-----------+  *
 *                                                                        *
 *  1. A company may have many taxis and many drivers (OneToMany).        *
 *  2. A driver may have only one address (OneToOne).                     *
 *  3. A driver may drive many taxis and                                  *
 *     a taxi may be driven by many drivers (ManyToMany through Ride).    *
 *  4. A taxi may pass through many breakdowns (OneToMany).               *
 *     and may have only one constructor (ManyToOne).                     *
 *  5. A constructor may have many departments (OneToMany).               *
 *  6. Many contructor may have many country (ManyToMany).                *
 *                                                                        *
 **************************************************************************/


var Offshore = require('../../../../lib/offshore');
var assert = require('assert');
var async = require('async');
var offshore = new Offshore();
var migrate = 'drop';

describe.skip('Deep', function() {
  var companyModel, taxiModel, driverModel, rideModel, constructorModel, addressModel, breakDownModel, departmentModel, countryModel;
  before(function(done) {
    var Company = Offshore.Collection.extend({
      identity: 'Company',
      connection: 'pop_deep',
      tableName: 'company_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'companyId',
          type: 'integer',
          primaryKey: true
        },
        name: {
          columnName: 'companyName',
          type: 'string'
        },
        taxis: {
          collection: 'Taxi',
          via: 'company'
        },
        drivers: {
          collection: 'Driver',
          via: 'company'
        }
      }
    });

    var Driver = Offshore.Collection.extend({
      identity: 'Driver',
      connection: 'pop_deep',
      tableName: 'driver_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'driverId',
          type: 'integer',
          primaryKey: true
        },
        name: {
          columnName: 'driverName',
          type: 'string'
        },
        taxis: {
          collection: 'Taxi',
          via: 'driver',
          through: 'ride'
        },
        address: {
          model: 'Address'
        },
        company: {
          model: 'Company'
        }
      }
    });

    var Taxi = Offshore.Collection.extend({
      identity: 'Taxi',
      connection: 'pop_deep',
      tableName: 'taxi_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'taxiId',
          type: 'integer',
          primaryKey: true
        },
        matricule: {
          columnName: 'taxiMatricule',
          type: 'string'
        },
        drivers: {
          collection: 'Driver',
          via: 'taxi',
          through: 'ride'
        },
        company: {
          model: 'Company'
        },
        constructor: {
          model: 'Constructor'
        },
        breakdowns: {
          collection: 'BreakDown',
          via: 'taxi'
        }
      }
    });

    var Ride = Offshore.Collection.extend({
      identity: 'Ride',
      connection: 'pop_deep',
      tableName: 'ride_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'rideId',
          type: 'integer',
          primaryKey: true
        },
        taxi: {
          model: 'Taxi'
        },
        driver: {
          model: 'Driver'
        }
      }
    });

    var Address = Offshore.Collection.extend({
      identity: 'Address',
      connection: 'pop_deep',
      tableName: 'address_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'addressId',
          type: 'integer',
          primaryKey: true
        },
        city: {
          columnName: 'addressCity',
          type: 'string'
        }
      }
    });

    var Constructor = Offshore.Collection.extend({
      identity: 'Constructor',
      connection: 'pop_deep',
      tableName: 'constructor_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'constructorId',
          type: 'integer',
          primaryKey: true
        },
        name: {
          columnName: 'constructorName',
          type: 'string'
        },
        taxis: {
          collection: 'Taxi',
          via: 'constructor'
        },
        departments: {
          collection: 'Department',
          via: 'constructor'
        },
        countries: {
          collection: 'Country',
          via: 'constructors'
        }
      }
    });
    var Country = Offshore.Collection.extend({
      identity: 'Country',
      connection: 'pop_deep',
      tableName: 'country_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'countryId',
          type: 'integer',
          primaryKey: true
        },
        name: 'string',
        constructors: {
          collection: 'Constructor',
          via: 'countries'
        }
      }
    });

    var BreakDown = Offshore.Collection.extend({
      identity: 'breakdown',
      connection: 'pop_deep',
      tableName: 'breakdown_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'breakDownId',
          type: 'integer',
          primaryKey: true
        },
        level: {
          columnName: 'breakDownLevel',
          type: 'integer'
        },
        taxi: {
          model: 'Taxi'
        }
      }
    });

    var Department = Offshore.Collection.extend({
      identity: 'Department',
      connection: 'pop_deep',
      tableName: 'department_table',
      migrate: migrate,
      attributes: {
        id: {
          columnName: 'departmentId',
          type: 'integer',
          primaryKey: true
        },
        name: {
          columnName: 'departmentName',
          type: 'string'
        },
        constructor: {
          model: 'Constructor'
        }
      }
    });

    var companies = [
      {id: 1, name: 'company 1'},
      {id: 2, name: 'company 2'}
    ];
    var drivers = [
      {id: 1, name: 'driver 1', company: 1, address: 1},
      {id: 2, name: 'driver 2', company: 2, address: 2},
      {id: 3, name: 'driver 3', company: 1, address: 3},
      {id: 4, name: 'driver 4', company: 2, address: 4}
    ];
    var taxis = [
      {id: 1, matricule: 'taxi_1', company: 1, constructor: 1},
      {id: 2, matricule: 'taxi_2', company: 2, constructor: 2},
      {id: 3, matricule: 'taxi_3', company: 2, constructor: 2},
      {id: 4, matricule: 'taxi_4', company: 1, constructor: 1},
      {id: 5, matricule: 'taxi_5', company: 1, constructor: 1}
    ];
    var rides = [
      {id: 1, taxi: 1, driver: 1},
      {id: 2, taxi: 4, driver: 1},
      {id: 3, taxi: 5, driver: 1},
      {id: 4, taxi: 2, driver: 2},
      {id: 5, taxi: 1, driver: 2},
      {id: 6, taxi: 3, driver: 3},
      {id: 7, taxi: 2, driver: 3}
    ];

    var addresses = [
      {id: 1, city: 'city 1'},
      {id: 2, city: 'city 2'},
      {id: 3, city: 'city 3'},
      {id: 4, city: 'city 4'}
    ];
    var constructors = [
      {id: 1, name: 'constructor 1'},
      {id: 2, name: 'constructor 2'}
    ];

    var breakDowns = [
      {id: 1, level: 5, taxi: 3},
      {id: 2, level: 7, taxi: 2},
      {id: 3, level: 1, taxi: 3},
      {id: 4, level: 8, taxi: 3},
      {id: 5, level: 9, taxi: 1},
      {id: 8, level: 9, taxi: 1},
      {id: 6, level: 10, taxi: 4},
      {id: 7, level: 11, taxi: 5}
    ];

    var departments = [
      {id: 1, name: 'dep 1', constructor: 1},
      {id: 2, name: 'dep 2', constructor: 1},
      {id: 3, name: 'dep 3', constructor: 2},
      {id: 4, name: 'dep 4', constructor: 1},
      {id: 5, name: 'dep 5', constructor: 2}
    ];

    var countries = [
      {id: 1, name: 'france'},
      {id: 2, name: 'germany'}
    ];

    offshore.loadCollection(Company);
    offshore.loadCollection(Driver);
    offshore.loadCollection(Taxi);
    offshore.loadCollection(Address);
    offshore.loadCollection(Ride);
    offshore.loadCollection(Constructor);
    offshore.loadCollection(BreakDown);
    offshore.loadCollection(Department);
    offshore.loadCollection(Country);

    var connections = {
      pop_deep: {
        adapter: 'adapter'
      }
    };

    offshore.initialize({adapters: {adapter: require('offshore-memory')}, connections: connections}, function(err, colls) {
      if (err) {
        return done(err);
      }

      companyModel = colls.collections.company;
      taxiModel = colls.collections.taxi;
      driverModel = colls.collections.driver;
      addressModel = colls.collections.address;
      rideModel = colls.collections.ride;
      constructorModel = colls.collections.constructor;
      breakDownModel = colls.collections.breakdown;
      departmentModel = colls.collections.department;
      countryModel = colls.collections.country;

      async.series([
        function(callback) {
          companyModel.createEach(companies, callback);
        },
        function(callback) {
          taxiModel.createEach(taxis, callback);
        },
        function(callback) {
          driverModel.createEach(drivers, callback);
        },
        function(callback) {
          rideModel.createEach(rides, callback);
        }, function(callback) {
          addressModel.createEach(addresses, callback);
        },
        function(callback) {
          constructorModel.createEach(constructors, callback);
        },
        function(callback) {
          breakDownModel.createEach(breakDowns, callback);
        },
        function(callback) {
          departmentModel.createEach(departments, callback);
        },
        function(callback) {
          countryModel.createEach(countries, function(err, countries) {
            if (err) {
              return callback(err);
            }
            countryModel.findOne(1, function(err, country) {
              country.constructors.add(1);
              country.constructors.add(2);
              country.save(callback);
            });
          });
        }
      ], function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });

  });

  describe('Populate', function() {
    it('should deeply populate a branch', function(done) {
      companyModel.find().sort('id asc')
        .populate('drivers.taxis', {sort: {id: 1}})
        .populate('drivers.taxis.constructor.departments', {sort: {id: 1}})
        .exec(function(err, companies) {
          if (err) {
            return done(err);
          }
          // Root Level
          assert(companies.length === 2 && companies[1].name === 'company 2', 'Root criteria not applied.');
          //Level 1
          assert(companies[1].drivers.length === 2, 'Could not populate first level oneToMany collection.');
          assert(companies[1].drivers[0].name === 'driver 2', 'First level not correctly populated.');

          //Level 2
          assert(companies[1].drivers[0].taxis.length === 2, 'Could not populate second level manyToMany collection.');
          var taxi1 = companies[1].drivers[0].taxis[0];
          var taxi2 = companies[1].drivers[0].taxis[1];
          assert(taxi1.matricule === 'taxi_1' && taxi2.matricule === 'taxi_2', 'Second level not correctly populated.');
          //Level 3
          assert(taxi1.constructor, 'Could not populate third level manyToOne model.');
          var constructor1 = taxi1.constructor;
          var constructor2 = taxi2.constructor;
          assert(constructor1.name === 'constructor 1' && constructor2.name === 'constructor 2',
            'Third level not correctly populated.');
          //Level 4
          assert(constructor1.departments.length === 3, 'Could not populate fourth level oneToMany collection.');
          assert(constructor1.departments[0].name === 'dep 1' && constructor1.departments[1].name === 'dep 2'
            && constructor1.departments[2].name === 'dep 4', 'Fourth level not correctly populated.');
          assert(constructor2.departments.length === 2, 'Could not populate fourth level oneToMany collection.');
          assert(constructor2.departments[0].name === 'dep 3',
            'Fourth level not correctly populated.');
          done();
        });
    });

    it('should deeply populate multiple branchs', function(done) {
      companyModel.find().where({name: 'company 2'})
        .populate('drivers.taxis', {sort: {id: 1}})
        .populate('drivers.address')
        .populate('taxis')
        .exec(function(err, companies) {
          if (err)
            return done(err);
          // Root Level
          assert(companies.length === 1 && companies[0].name === 'company 2', 'Root criteria not applied.');
          //Level 1
          assert(companies[0].drivers.length === 2, 'Could not populate first level oneToMany collection.');
          assert(companies[0].drivers[0].name === 'driver 2', 'First level not correctly populated.');
          assert(companies[0].taxis.length === 2, 'First level not correctly populated.');
          //Level 2 A
          assert(companies[0].drivers[0].taxis.length === 2, 'Could not populate second level manyToMany collection.');
          var taxi1 = companies[0].drivers[0].taxis[0];
          assert(taxi1.matricule === 'taxi_1', 'Second level (A) not correctly populated.');
          //Level 2 B
          assert(companies[0].drivers[0].address.city === 'city 2', 'Second level (B) criteria not populated.');
          done();
        });
    });

    it('should apply criteria to current populate path last alias', function(done) {
      companyModel.find().where({name: 'company 1'})
        .populate('drivers', {name: 'driver 3'})
        .populate('drivers.taxis', {matricule: 'taxi_3'})
        .populate('drivers.taxis.breakdowns', {where: {level: {'>': 2}}, sort: {level: 1}})
        .exec(function(err, companies) {
          if (err)
            return done(err);
          // Root Level
          assert(companies.length === 1 && companies[0].name === 'company 1', 'Root criteria not applied.');
          //Level 1
          assert(companies[0].drivers.length === 1, 'Could not populate first level oneToMany collection.');
          assert(companies[0].drivers[0].name === 'driver 3', 'First level criteria not applied.');
          //Level 2
          assert(companies[0].drivers[0].taxis.length === 1, 'Could not populate second level manyToMany collection.');
          var taxi = companies[0].drivers[0].taxis[0];
          assert(taxi.matricule === 'taxi_3', 'Second level criteria not applied.');
          //Level 3
          assert(taxi.breakdowns.length === 2, 'Could not populate third level oneToMany collection.');
          assert(taxi.breakdowns[0].level === 5 && taxi.breakdowns[1].level === 8, 'Third level criteria not applied.');

          done();
        });
    });

    it('should deeply populate nested collections', function(done) {
      companyModel.find().where({id: 2})
        .populate('taxis')
        .populate('taxis.breakdowns')
        .exec(function(err, company) {
          if (err)
            return done(err);
          assert(company[0].taxis[0].breakdowns.length === 1);
          assert(company[0].taxis[1].breakdowns.length === 3);
          done();
        });
    });

    it('findOne with populate deep should return undefined if there is no results', function(done) {
      companyModel.findOne().where({id: 999})
        .populate('taxis')
        .populate('taxis.breakdowns')
        .exec(function(err, company) {
          if (err) {
            return done(err);
          }
          assert(company === void(0));
          done();
        });
    });
  });
  describe('Criteria', function() {
    it('should find model using deep criteria on belongsTo', function(done) {
      taxiModel.find({where: {constructor: {name: 'constructor 1'}}}).populate('constructor').exec(function(err, taxis) {
        if (err) {
          return done(err);
        }
        assert(taxis.length === 3);
        assert(taxis[0].constructor.name === 'constructor 1');
        assert(taxis[1].constructor.name === 'constructor 1');
        assert(taxis[2].constructor.name === 'constructor 1');
        done();
      });
    });

    it('should find model using deep criteria on hasManyToOne', function(done) {
      taxiModel.find({where: {breakdowns: {level: 11}}}).populate('breakdowns').exec(function(err, taxis) {
        if (err) {
          return done(err);
        }
        assert(taxis[0].id === 5);
        assert(taxis[0].breakdowns[0].id === 7);
        assert(taxis[0].breakdowns[0].level === 11);
        done();
      });
    });

    it('should find model using deep criteria on hasManyToMany', function(done) {
      constructorModel.find({where: {countries: {name: 'france'}}}).populate('countries').exec(function(err, constructors) {
        if (err) {
          return done(err);
        }
        assert(constructors.length === 2);
        assert(constructors[0].countries[0].name === 'france');
        assert(constructors[1].countries[0].name === 'france');
        done();
      });
    });

    it('should find model using deep criteria on hasManyToMany through', function(done) {
      driverModel.find({where: {taxis: {matricule: 'taxi_4'}}}).populate('taxis', {sort: 'matricule'}).exec(function(err, drivers) {
        if (err) {
          return done(err);
        }
        assert(drivers.length === 1);
        assert(drivers[0].id === 1);
        assert(drivers[0].taxis.length === 3);
        assert(drivers[0].taxis[0].matricule === 'taxi_1');
        assert(drivers[0].taxis[1].matricule === 'taxi_4');
        assert(drivers[0].taxis[2].matricule === 'taxi_5');
        done();
      });
    });

    it('should find model using deep criteria with operator', function(done) {
      driverModel.find({sort: 'id', where: {taxis: {or: [{matricule: 'taxi_1'}, {matricule: 'taxi_2'}]}}}).populate('taxis', {sort: 'matricule'}).exec(function(err, drivers) {
        if (err) {
          return done(err);
        }
        assert(drivers.length === 3);
        assert(drivers[0].id === 1);
        assert(drivers[0].taxis.length === 3);
        assert(drivers[0].taxis[0].matricule === 'taxi_1');
        assert(drivers[0].taxis[1].matricule === 'taxi_4');
        assert(drivers[0].taxis[2].matricule === 'taxi_5');
        assert(drivers[1].id === 2);
        assert(drivers[1].taxis.length === 2);
        assert(drivers[1].taxis[0].matricule === 'taxi_1');
        assert(drivers[1].taxis[1].matricule === 'taxi_2');
        assert(drivers[2].id === 3);
        assert(drivers[2].taxis.length === 2);
        assert(drivers[2].taxis[0].matricule === 'taxi_2');
        assert(drivers[2].taxis[1].matricule === 'taxi_3');
        done();
      });
    });

    it('should find model using deep criteria in operator', function(done) {
      driverModel.find({sort: 'id', where: {or: [{taxis: {matricule: 'taxi_3'}}, {address: {city: 'city 4'}}]}}).populate('taxis', {sort: 'matricule'}).exec(function(err, drivers) {
        if (err) {
          return done(err);
        }
        assert(drivers.length === 2);
        assert(drivers[0].id === 3);
        assert(drivers[0].taxis.length === 2);
        assert(drivers[0].taxis[0].matricule === 'taxi_2');
        assert(drivers[0].taxis[1].matricule === 'taxi_3');
        assert(drivers[1].id === 4);
        assert(drivers[1].taxis.length === 0);
        assert(drivers[1].address === 4);
        done();
      });
    });

    it('should populate using deep criteria', function(done) {
      driverModel.findOne(3).populate('taxis', {sort: 'matricule', where: {breakdowns: {level: 5}}}).exec(function(err, driver) {
        if (err) {
          return done(err);
        }
        assert(driver.taxis.length === 1);
        assert(driver.taxis[0].id === 3);
        done();
      });
    });
  });

  describe('Associations', function() {

    it('should deeply populate and apply criteria on associations (One-to-One)', function(done) {
      taxiModel.findOne({where: {matricule: 'taxi_1'}})
        .populate('constructor', {where: {name: 'constructor 1'}})
        .populate('constructor.departments', {name: {contains: '4'}})
        .exec(function(err, taxi) {
          if (err)
            return done(err);
          // Root Level
          assert(taxi.matricule === 'taxi_1', 'Root criteria not applied.');
          //Level 1
          assert(taxi.constructor, 'Could not populate first level with criteria.');
          assert(taxi.constructor.name === 'constructor 1', 'First level criteria not applied.');
          //Level 2
          assert(taxi.constructor.departments, 'Second level not populated.');
          assert(taxi.constructor.departments[0].name === 'dep 4', 'Second level criteria not applied.');
          done();
        });
    });

    it('should deeply populate and apply criteria on associations (One-to-Many)', function(done) {
      companyModel.findOne({where: {name: 'company 1'}})
        .populate('taxis', {matricule: 'taxi_4'})
        .populate('taxis.breakdowns', {level: 10})
        .exec(function(err, company) {
          if (err)
            return done(err);
          // Root Level
          assert(company.name === 'company 1', 'Root criteria not applied.');
          //Level 1
          assert(company.taxis, 'Could not populate first level');
          assert(company.taxis[0].matricule === 'taxi_4', 'First level criteria not applied.');
          //Level 2
          assert(company.taxis[0].breakdowns, 'Second level not populated.');
          assert(company.taxis[0].breakdowns[0].level === 10, 'Second level criteria not applied.');
          done();
        });
    });

    it('should deeply populate and apply criteria on associations (Many-to-Many Through)', function(done) {
      driverModel.findOne({where: {name: 'driver 1'}})
        .populate('taxis', {matricule: 'taxi_4'})
        .populate('taxis.breakdowns', {level: 10})
        .exec(function(err, driver) {
          if (err)
            return done(err);
          // Root Level
          assert(driver.name === 'driver 1', 'Root criteria not applied.');
          //Level 1
          assert(driver.taxis, 'Could not populate first level with criteria.');
          assert(driver.taxis[0].matricule === 'taxi_4', 'first level criteria not applied.');
          //Level 2
          assert(driver.taxis[0].breakdowns, 'Second level not populated.');
          assert(driver.taxis[0].breakdowns[0].level === 10, 'Second level criteria not applied.');
          done();
        });
    });

    it('should deeply populate and apply criteria on associations (Many-to-Many)', function(done) {
      countryModel.findOne({name: 'france'})
        .populate('constructors', {name: 'constructor 1'})
        .populate('constructors.departments', {name: 'dep 4'})
        .exec(function(err, country) {
          if (err) {
            done(err);
          }
          assert(country.name === 'france', 'Root criteria not applied.');
          assert(country.constructors, 'Could not populate first level with criteria.');
          assert(country.constructors[0].name === 'constructor 1', 'first level criteria not applied.');
          assert(country.constructors[0].departments, 'Second level not populated.');
          assert(country.constructors[0].departments[0].name === 'dep 4', 'Second level criteria not applied.');
          done();
        });
    });

    it('should deeply populate and apply criteria on associations (Many-to-One)', function(done) {
      taxiModel.findOne({where: {matricule: 'taxi_1'}})
        .populate('constructor', {where: {name: 'constructor 1'}})
        .populate('constructor.departments', {name: {contains: '4'}})
        .exec(function(err, taxi) {
          if (err) {
            return done(err);
          }
          // Root Level
          assert(taxi.matricule === 'taxi_1', 'Root criteria not applied.');
          //Level 1
          assert(taxi.constructor, 'Could not populate first level with criteria.');
          assert(taxi.constructor.name === 'constructor 1', 'First level criteria not applied.');
          //Level 2
          assert(taxi.constructor.departments, 'Second level not populated.');
          assert(taxi.constructor.departments[0].name === 'dep 4', 'Second level criteria not applied.');
          done();
        });
    });
  });
});

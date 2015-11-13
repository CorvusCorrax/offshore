var Offshore = require('../../../../lib/offshore');
var assert = require('assert');
var async = require('async');

describe('Collection Query', function () {

  describe('many to many through association', function () {
    var Driver;
    var Ride;
    var Taxi;

    before(function (done) {

      var offshore = new Offshore();
      var collections = {};

      collections.driver = Offshore.Collection.extend({
        identity: 'Driver',
        connection: 'foo',
        tableName: 'driver_table',
        attributes: {
          "driverId": {
            "type": "integer",
            "primaryKey": true
          },
          "driverName": {
            "type": "string"
          },
          "taxis": {
            "collection": "Taxi",
            "via": "driver",
            "through": "ride"
          }
        }
      });

      collections.taxi = Offshore.Collection.extend({
        identity: 'Taxi',
        connection: 'foo',
        tableName: 'taxi_table',
        attributes: {
          "taxiId": {
            "type": "integer",
            "primaryKey": true
          },
          "taxiMatricule": {
            "type": "string"
          },
          "drivers": {
            "collection": "Driver",
            "via": "taxi",
            "through": "ride"
          }
        }
      });

      collections.ride = Offshore.Collection.extend({
        identity: 'Ride',
        connection: 'foo',
        tableName: 'ride_table',
        attributes: {
          "rideId": {
            "type": "integer",
            "primaryKey": true
          },
          "taxi": {
            "model": "Taxi"
          },
          "driver": {
            "model": "Driver"
          }
        }
      });

      offshore.loadCollection(collections.driver);
      offshore.loadCollection(collections.taxi);
      offshore.loadCollection(collections.ride);

      var connections = {
        'foo': {
          adapter: 'adapter'
        }
      };

      offshore.initialize({adapters: {adapter: require('offshore-memory')}, connections: connections}, function (err, colls) {
        if (err)
          done(err);
        Driver = colls.collections.driver;
        Taxi = colls.collections.taxi;
        Ride = colls.collections.ride;

        var drivers = [
          {driverId: 1, driverName: 'driver 1'},
          {driverId: 2, driverName: 'driver 2'}
        ];
        var taxis = [
          {taxiId: 1, taxiMatricule: 'taxi_1'},
          {taxiId: 2, taxiMatricule: 'taxi_2'}
        ];
        var rides = [
          {rideId: 1, taxi: 1, driver: 1},
          {rideId: 4, taxi: 2, driver: 2},
          {rideId: 5, taxi: 1, driver: 2}
        ];

        async.series([
          function (callback) {
            Driver.createEach(drivers, callback);
          },
          function (callback) {
            Taxi.createEach(taxis, callback);
          },
          function (callback) {
            Ride.createEach(rides, callback);
          }
        ], function (err) {
          done();
        });
      });
    });


    it('through table model associations should return a single objet', function (done) {
      Ride.findOne(1)
              .populate('taxi')
              .populate('driver')
              .exec(function (err, ride) {
                if (err)
                  return done(err);
                assert(!Array.isArray(ride.taxi), "through table model associations return Array instead of single Objet");
                assert(!Array.isArray(ride.driver), "through table model associations return Array instead of single Objet");
                assert(ride.taxi.taxiId === 1);
                assert(ride.taxi.taxiMatricule === 'taxi_1');
                assert(ride.driver.driverId === 1);
                assert(ride.driver.driverName === 'driver 1');
                done();
              });
    });

    it('through association shoud return many results', function (done) {
      Driver.findOne(2).populate('taxis', {sort: {taxiId: 1}}).exec(function (err, driver) {
        assert(driver.taxis.length === 2);
        assert(driver.taxis[0].taxiId === 1);
        assert(driver.taxis[0].taxiMatricule === 'taxi_1');
        done();
      });
    });

  });
});
var get = Ember.get, set = Ember.set;
var HomePlanet, league, SuperVillain, superVillain, EvilMinion, YellowMinion, MaleMinion, FemaleMinion, env;
module('integration/ember-json-api-adapter - serializer', {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo('homePlanet'),
      evilMinions:   DS.hasMany('evilMinion')
    });

    MegaVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      minions:   DS.hasMany('blueMinion'),
    });

    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      superVillains: DS.hasMany('superVillain', { async: true })
    });

    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
    });

    YellowMinion = EvilMinion.extend();
    BlueMinion = DS.Model.extend({
      superVillain: DS.belongsTo('megaVillain')
    });

    MaleMinion = DS.Model.extend({
      wife: DS.belongsTo('femaleMinion')
    });

    FemaleMinion = DS.Model.extend({
      husband: DS.belongsTo('maleMinion')
    });

    env = setupStore({
      superVillain:   SuperVillain,
      megaVillain:    MegaVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      blueMinion:     BlueMinion,
      maleMinion:     MaleMinion,
      femaleMinion:   FemaleMinion
    });

    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
  },

  teardown: function() {
    Ember.run(env.store, 'destroy');
  }
});

test("superVillain.evilMinions.firstObject.superVillain should equal superVillain", function() {
  var record, operation, payload;
  var adapterPayload = {
    linked: {
      evilMinions: [
        {
          id: 3,
          name: "Ray",
          links: {
            superVillain: 1
          }
        }
      ]
    },
    superVillains: [
      {
        id: 1,
        name: "Denis",
        links: {
          evilMinions: [3]
        }
      }
    ]
  };
  var SuperVillainAdapter = DS.RESTAdapter.extend({
    find: function() {
      return new Ember.RSVP.Promise(function(resolve, reject) { return; }); // don't fulfill
    }
  });
  env.container.register('adapter:superVillain', SuperVillainAdapter);

  Ember.run(function() {
    operation = "createRecord";
    record = env.store.createRecord(SuperVillain, {
      name: "Denis"
    });
    record.adapterWillCommit();
    payload = env.serializer.extract(env.store, SuperVillain, adapterPayload, Ember.get(record, 'id'), operation);
    env.store.didSaveRecord(record, payload);
  });

  Ember.run(function() {
    var sameRecord = record.get('evilMinions.firstObject.superVillain');

    // passing
    equal(record.get('id'), sameRecord.get('id'), "ids match")
    equal(record.constructor, sameRecord.constructor, "types match")

    // failing
    equal(record.toString(), sameRecord.toString(), "toString() matches");
    ok(record === sameRecord, "record object is the same object");
  });
});

test('serialize camelcase', function() {
  var tom;

  Ember.run(function() {
    league = env.store.createRecord(HomePlanet, {
      name: 'Villain League',
      id: '123'
    });

    tom = env.store.createRecord(SuperVillain, {
      firstName: 'Tom',
      lastName: 'Dale',
      homePlanet: league
    });
  });

  var json = Ember.run(function(){
    return env.serializer.serialize(tom);
  });

  deepEqual(json, {
    firstName: 'Tom',
    lastName: 'Dale',
    links: {
      evilMinions: [],
      homePlanet: get(league, 'id')
    }
  });
});

test('serialize into snake_case', function() {
  var tom;

  Ember.run(function() {
    league = env.store.createRecord(HomePlanet, {
      name: 'Villain League',
      id: '123'
    });

    tom = env.store.createRecord(SuperVillain, {
      firstName: 'Tom',
      lastName: 'Dale',
      homePlanet: league
    });
  });

  env.serializer.keyForAttribute = function(key) {
    return Ember.String.decamelize(key);
  };

  env.serializer.keyForRelationship = function(key, relationshipKind) {
    return Ember.String.decamelize(key);
  };

  var json = Ember.run(function(){
    return env.serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: 'Tom',
    last_name: 'Dale',
    links: {
      evil_minions: [],
      home_planet: get(league, 'id')
    }
  });
});

test('serializeIntoHash', function() {
  var json = {};

  Ember.run(function(){
    league = env.store.createRecord(HomePlanet, {
      name: 'Umber',
      id: '123'
    });

   env.serializer.serializeIntoHash(json, HomePlanet, league);
  });

  deepEqual(json, {
    homePlanet: {
      name: 'Umber',
      links: {
        superVillains: []
      }
    }
  });
});

test('serializeIntoHash with decamelized types', function() {
  HomePlanet.typeKey = 'home-planet';
  var json = {};

  Ember.run(function() {
    league = env.store.createRecord(HomePlanet, {
      name: 'Umber',
      id: '123'
    });

    env.serializer.serializeIntoHash(json, HomePlanet, league);
  });

  deepEqual(json, {
    homePlanet: {
      name: 'Umber',
      links: {
        superVillains: []
      }
    }
  });
});

test('serialize has many relationships', function() {
  var minime, minime2, drevil;

  Ember.run(function() {
    drevil = env.store.createRecord(MegaVillain, {
      firstName: 'Dr',
      lastName: 'Evil'
    });

    minime = env.store.createRecord(BlueMinion, {
      id: '123',
      name: 'Mini me',
      superVillain: drevil
    });

    minime2 = env.store.createRecord(BlueMinion, {
      id: '345',
      name: 'Mini me 2',
      superVillain: drevil
    });
  });

  var json = Ember.run(function(){
    return env.serializer.serialize(drevil);
  });

  deepEqual(json, {
    firstName: 'Dr',
    lastName: 'Evil',
    links: {
      minions: {
        ids: ['123', '345'],
        type: 'blueMinion'
      }
    }
  });
});

test('serialize belongs to relationships', function() {
  var male, female;

  Ember.run(function() {
    // Of course they belong to each other
    female = env.store.createRecord(FemaleMinion);
    male = env.store.createRecord(MaleMinion, {
      id: 2,
      wife: female
    });
  });

  var json = Ember.run(function(){
    return env.serializer.serialize(female);
  });

  deepEqual(json, {
    links: {
      husband: {
        id: '2',
        type: 'maleMinion'
      }
    }
  });
});

test('normalize camelCased', function() {
  var superVillain_hash = {
    firstName: 'Tom',
    lastName: 'Dale',
    links: {
      homePlanet: '123',
      evilMinions: [1,2]
    }
  };

  var json = Ember.run(function() {
    return env.serializer.normalize(SuperVillain, superVillain_hash, 'superVillain');
  });

  deepEqual(json, {
    firstName: 'Tom',
    lastName: 'Dale',
    homePlanet: '123',
    evilMinions: [1,2]
  });
});

test('normalize links camelized', function() {
  var homePlanet = {
    id: '1',
    name: 'Umber',
    links: {
      superVillains: '/api/super_villians/1'
    }
  };

  var json = Ember.run(function() {
    return env.serializer.normalize(HomePlanet, homePlanet, 'homePlanet');
  });

  equal(json.superVillains,  '/api/super_villians/1', 'normalize links');
});

test('extractSingle snake_case', function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
    home_planet:   {
      id: '1',
      name: 'Umber',
      links: {
        super_villains: [1]
      }
    },
    super_villains:  [{
      id: '1',
      first_name: 'Tom',
      last_name: 'Dale',
      links: {
        home_planet: '1'
      }
    }]
  };

  env.serializer.keyForAttribute = function(key) {
    return Ember.String.decamelize(key);
  };

  env.serializer.keyForRelationship = function(key, relationshipKind) {
    return Ember.String.decamelize(key);
  };

  Ember.run(function() {
    return env.serializer.extractSingle(env.store, HomePlanet, json_hash);
  });

  env.store.find('superVillain', 1).then(function(minion){
    equal(minion.get('firstName'), 'Tom');
  });
});

test('extractSingle camelCase', function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
    home_planet:   {
      id: '1',
      name: 'Umber',
      links: {
        super_villains: [1]
      }
    },
    linked: {
      super_villains:  [{
        id: '1',
        firstName: 'Tom',
        lastName: 'Dale',
        links: {
          homePlanet: '1'
        }
      }]
    }
  };

  Ember.run(function() {
    return env.serializer.extractSingle(env.store, HomePlanet, json_hash);
  });

  env.store.find('superVillain', 1).then(function(minion){
    equal(minion.get('firstName'), 'Tom');
  });
});

test('extractArray snake_case', function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
      home_planets: [{
        id: '1',
        name: 'Umber',
        links: {
          super_villains: [1]
        }
      }],
      linked: {
        super_villains: [{
          id: '1',
          first_name: 'Tom',
          last_name: 'Dale',
          links: {
            home_planet: '1'
          }
        }]
      }
  };

  env.serializer.keyForAttribute = function(key) {
    return Ember.String.decamelize(key);
  };

  env.serializer.keyForRelationship = function(key, relationshipKind) {
    return Ember.String.decamelize(key);
  };

  Ember.run(function() {
    env.serializer.extractArray(env.store, HomePlanet, json_hash);
  });

  env.store.find('superVillain', 1).then(function(minion){
    equal(minion.get('firstName'), 'Tom');
  });
});
// TODO: test something that utilizes the flattening of links in normalize

test('extractArray', function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
      home_planets: [{
        id: '1',
        name: 'Umber',
        links: {
          super_villains: [1]
        }
      }],
      linked: {
        super_villains: [{
          id: '1',
          first_name: 'Tom',
          last_name: 'Dale',
          links: {
            home_planet: '1'
          }
        }]
      }
  };

  env.serializer.keyForAttribute = function(key) {
    return Ember.String.decamelize(key);
  };

  env.serializer.keyForRelationship = function(key, relationshipKind) {
    return Ember.String.decamelize(key);
  };

  Ember.run(function() {
    env.serializer.extractArray(env.store, HomePlanet, json_hash);
  });

  env.store.find('superVillain', 1).then(function(minion){
    equal(minion.get('firstName'), 'Tom');
  });
});

test('looking up a belongsTo association', function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
    home_planets: [{
      id: '1',
      name: 'Umber',
      links: {
        super_villains: [1]
      }
    }],
    linked: {
      super_villains: [{
        id: '1',
        first_name: 'Tom',
        last_name: 'Dale',
        links: {
          home_planet: '1'
        }
      }]
    }
  };

  env.serializer.keyForAttribute = function(key) {
    return Ember.String.decamelize(key);
  };

  env.serializer.keyForRelationship = function(key, relationshipKind) {
    return Ember.String.decamelize(key);
  };

  Ember.run(function() {
    env.store.pushMany('homePlanet', env.serializer.extractArray(env.store, HomePlanet, json_hash));
  });

  Ember.run(function() {
    env.store.find('homePlanet', 1).then(function(planet){
      return planet.get('superVillains').then(function(villains) {
        equal(villains.get('firstObject').get('id'), 1);
      });
    });
  });
});

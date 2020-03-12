const { getCollection, log, tpClient, rgSvc, db } = require('../helpers');
const { get } = require('lodash');
const { aql } = require('arangojs');

(async () => {
  for (const entity of
    [['countries'], ['cities'], ['airports'], ['airlines'], ['planes', '/data'], ['airlines_alliances', '/data']]) {
    try {
      await load(entity);
    }
    catch (e) {
      log('error', e.message);
    }
  }

  const entity = ['routes', '/data', 'edge', {
    from: ['airports', 'departure_airport_iata'],
    to: ['airports', 'arrival_airport_iata']
  }];
  await load(entity);

  const links = [
    ['airports', 'cities', 'city_code', 'airports_cities'],
    ['airports', 'countries', 'country_code', 'airports_countries'],
    ['cities', 'countries', 'country_code', 'cities_countries']
  ];
  for (const linkParams of links) {
    log('info', `Linking ${linkParams[0]} to ${linkParams[1]}...`);
    await link(...linkParams);
  }
})();

async function load(entity) {
  const collName = entity[0];
  const type = get(entity, '2', 'vertex');
  const endpoints = get(entity, '3');
  const coll = await getCollection(collName, type);
  const properties = await coll.load();

  if (properties.count === 0) {
    const data = await fetchData(...entity);
    await importData(data, coll.name, type, endpoints);
  }
  else {
    log('info', `Found ${properties.count} entries in ${collName}`);
  }
}

async function fetchData(entity, path = '/data/en-GB') {
  log('info', `Fetching list of ${entity}...`);
  const response = await tpClient.get(`${path}/${entity}.json`);
  const data = response.data;
  log('info', `Got ${data.length} ${entity}.`);

  return data;
}

async function importData(data, collName, type, endpoints) {
  for (const node of data) {
    node._key = node.code;
    if (node.hasOwnProperty('name')) {
      node.name = get(node, ['name_translations', 'en'], node.name);
    }
    if (type === 'edge') {
      node._from = `${endpoints.from[0]}/${node[endpoints.from[1]]}`;
      node._to = `${endpoints.to[0]}/${node[endpoints.to[1]]}`;
    }
  }

  log('info', `Loading ${collName} into database...`);
  await rgSvc.post(`document/${collName}`, data, {}, { accept: 'application/json' });
  log('info', `Loaded ${data.length} ${collName} into database.`);
}

async function link(childCollName, parentCollName, parentField, linkCollName) {
  const linkColl = await getCollection(linkCollName, 'edge');
  const properties = await linkColl.load();

  if (properties.count === 0) {
    const childColl = await getCollection(childCollName, 'vertex');
    const parentColl = await getCollection(parentCollName, 'vertex');

    try {
      const query = aql`
    for p in ${parentColl}
    for c in ${childColl}
    filter c[${parentField}] == p.code
    
    return {p, c}
  `;
      const cursor = await db.query(query);
      const links = [];

      await cursor.each((rel) => {
        links.push({
          _from: rel.c._id,
          _to: rel.p._id
        });
      });

      await rgSvc.post(`document/${linkCollName}`, links, {}, { accept: 'application/json' });
      log('info', `Inserted ${links.length} links from ${childCollName} to ${parentCollName}.`);
    }
    catch (e) {
      log('error', e.message);
    }
  }
  else {
    log('info', `Found ${properties.count} entries in ${linkCollName}`);
  }
}
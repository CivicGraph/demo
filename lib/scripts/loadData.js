const { getCollection, log, tpClient, rgSvc } = require('../helpers');
const { get } = require('lodash');

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

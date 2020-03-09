const { getCollection, log, rgSvc, tpClient } = require('../helpers');
const { omit, isEqual, isEmpty, pickBy, isInteger, values } = require('lodash');

const CURRENCY = 'usd';

(async () => {
  const flightsColl = await getCollection('flights', 'edge');
  const cheapestColl = await getCollection('cheapest_tickets', 'edge');

  const path = '/v2/prices/latest';
  const params = {
    currency: CURRENCY,
    period_type: 'year',
    one_way: true,
    limit: 1000
  };

  let page = 0;
  let data;

  do {
    try {
      params.page = ++page;

      log('info', `Getting price info page ${page}...`);
      const response = await tpClient.get(path, { params });
      data = response.data.data;
      log('info', `Got ${data.length} prices.`);

      for (const trip of data) {
        await importCheapestTickets(trip, cheapestColl, flightsColl);
      }
    }
    catch (e) {
      log('error', e);
    }
  } while (data.length > 0);
})();

async function importCheapestTickets(trip, cheapestColl, flightsColl) {
  try {
    const { origin, destination, depart_date } = trip;
    const depart_month = depart_date.slice(0, -3);

    const cheapestTickets = await getCheapestTickets(origin, destination, depart_month, CURRENCY);
    if (cheapestTickets) {
      log('info', `Got cheapest tickets from ${origin} to ${destination} for month ${depart_month}.`);

      const key = `${origin}-${destination}-${depart_month}`;
      cheapestTickets._key = key;
      cheapestTickets._from = `airports/${origin}`;
      cheapestTickets._to = `airports/${destination}`;

      const dbNode = await cheapestColl.document(key, { graceful: true });
      if (isEmpty(dbNode)) {
        log('info',
          `No db entry for cheapest tickets from ${origin} to ${destination} for month ${depart_month}. Creating...`);
        await rgSvc.post(`document/${cheapestColl.name}`, cheapestTickets, {}, { accept: 'application/json' });
      }
      else {
        log('info',
          `Found db entry for cheapest tickets from ${origin} to ${destination} for month ${depart_month}.`);
        const transientNode = omit(dbNode, '_id', '_rev');
        if (!isEqual(cheapestTickets, transientNode)) {
          log('info',
            `DB entry and latest fetch mismatch for cheapest tickets from ${origin} to ${destination} for month ${depart_month}. Updating...`);
          await rgSvc.put(`document/${cheapestColl.name}`, cheapestTickets, {}, { accept: 'application/json' });
        }
        else {
          log('info',
            `DB entry and latest fetch match for cheapest tickets from ${origin} to ${destination} for month ${depart_month}. Skipping...`);
        }
      }

      await importFlights(cheapestTickets, origin, destination, flightsColl);
    }
  }
  catch (e) {
    log('error', e);
  }
}

async function importFlights(cheapestTickets, origin, destination, flightsColl) {
  const flights = values(pickBy(cheapestTickets, (value, key) => isInteger(parseInt(key))));
  for (const flight of flights) {
    try {
      const { airline, flight_number, departure_at } = flight;
      const depart_date = departure_at.slice(0, 10);
      const key = `${airline}-${flight_number}-${depart_date}`;

      flight._key = key;
      flight._from = `airports/${origin}`;
      flight._to = `airports/${destination}`;

      const dbNode = await flightsColl.document(key, { graceful: true });
      if (isEmpty(dbNode)) {
        log('info',
          `No db entry for flight from ${origin} to ${destination} for date ${depart_date}. Creating...`);
        await rgSvc.post(`document/${flightsColl.name}`, flight, {}, { accept: 'application/json' });
      }
      else {
        log('info',
          `Found db entry for flight from ${origin} to ${destination} for date ${depart_date}.`);
        const transientNode = omit(dbNode, '_id', '_rev');
        if (!isEqual(flight, transientNode)) {
          log('info',
            `DB entry and latest fetch mismatch for flight from ${origin} to ${destination} for date ${depart_date}. Updating...`);
          await rgSvc.put(`document/${flightsColl.name}`, flight, {}, { accept: 'application/json' });
        }
        else {
          log('info',
            `DB entry and latest fetch match for flight from ${origin} to ${destination} for date ${depart_date}. Skipping...`);
        }
      }
    }
    catch (e) {
      log('error', e);
    }
  }
}

async function getCheapestTickets(origin, destination, depart_month, currency) {
  const path = '/v1/prices/cheap';
  const params = { origin, destination, depart_month, currency };

  log('info', `Getting cheapest tickets from ${origin} to ${destination} for month ${depart_month}...`);
  const response = await tpClient.get(path, { params });

  return response.data.data[destination];
}

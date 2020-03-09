const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const chalk = require('chalk');
const axios = require('axios').default;
const { Database } = require('arangojs');
const { isString, isError } = require('lodash');

const env = dotenv.config();
dotenvExpand(env);

const {
  TOKEN, TP_BASE_URL, ADB_BASE_URL, ARANGO_VERSION, RG_MOUNT_POINT, RG_DB, RG_USER, RG_PASSWD
} = process.env;

const db = new Database({
  url: ADB_BASE_URL,
  arangoVersion: ARANGO_VERSION
});
db.useDatabase(RG_DB);
db.useBasicAuth(RG_USER, RG_PASSWD);

exports.db = db;

const rgSvc = db.route(RG_MOUNT_POINT);

exports.rgSvc = rgSvc;

const options = {
  baseURL: TP_BASE_URL,
  headers: {
    'X-Access-Token': TOKEN,
    'Accept-Encoding': 'gzip, deflate'
  }
};
const tpClient = axios.create(options);

exports.tpClient = tpClient;

const LOG_COLORS = {
  INFO: {
    stream: console.log.bind(console),
    color: 'white'
  },
  ERROR: {
    stream: console.error.bind(console),
    color: 'red'
  },
  WARNING: {
    stream: console.error.bind(console),
    color: 'yellow'
  },
  DEBUG: {
    stream: console.log.bind(console),
    color: 'gray'
  }
};

exports.getCollection = async function (collName, type) {
  let coll;

  switch (type) {
    case 'vertex':
      coll = db.collection(collName);

      break;
    case 'edge':
      coll = db.edgeCollection(collName);

      break;
    default:
      return Promise.reject('Unsupported collection type.');
  }

  if (!(await coll.exists())) {
    await coll.create();
  }

  return coll;
};

exports.log = function (level, message) {
  const logger = LOG_COLORS[level.toUpperCase()];

  if (isError(message)) {
    logger.stream(message);
  }
  else {
    if (!isString(message)) {
      message = JSON.stringify(message, null, 2);
    }
    logger.stream(chalk[logger.color](message));
  }
};

import mongoose from 'mongoose';
import { getLogger } from '../logger.js';
import { config } from '../config/index.js';

/**
 * Connect to MongoDB using Mongoose.
 * @param {string} uri - MongoDB connection string
 */
/**
 * Connect to MongoDB using Mongoose.
 * If the URI does not include a database, you can pass { dbName }.
 * @param {string} uri - MongoDB connection string
 * @param {{ dbName?: string }} [options]
 */
export async function connectMongo(uri, options = {}) {
  const log = getLogger();
  mongoose.set('strictQuery', true);
  try {
    const monitor = Boolean(config.DB_LOG_COMMANDS || (Number(config.DB_SLOW_MS) || 0) > 0);
    await mongoose.connect(uri, { maxPoolSize: 10, dbName: options.dbName || undefined, monitorCommands: monitor });
    log.info({ uri: safeMongoUri(uri) }, 'MongoDB connected');

    if (monitor) {
      const startTimes = new Map();
      const ignored = new Set(['isMaster', 'hello', 'saslStart', 'saslContinue', 'buildInfo', 'getLastError', 'ping']);
      mongoose.connection.on('commandStarted', (ev) => {
        if (ignored.has(ev.commandName)) return;
        startTimes.set(ev.requestId, process.hrtime.bigint());
      });
      const logResult = (ev, ok) => {
        const start = startTimes.get(ev.requestId);
        if (!start) return;
        startTimes.delete(ev.requestId);
        const durMs = Number(process.hrtime.bigint() - start) / 1e6;
        const ns = ev.databaseName ? `${ev.databaseName}` : undefined;
        const shouldLog = config.DB_LOG_COMMANDS || durMs >= (Number(config.DB_SLOW_MS) || 0);
        if (!shouldLog) return;
        log.info({ cmd: ev.commandName, ns, durationMs: Math.round(durMs), ok }, 'db_command');
      };
      mongoose.connection.on('commandSucceeded', (ev) => logResult(ev, true));
      mongoose.connection.on('commandFailed', (ev) => logResult(ev, false));
    }
  } catch (err) {
    log.error({ err }, 'MongoDB connection error');
    throw err;
  }
}

/**
 * Disconnect the Mongoose client.
 */
export async function disconnectMongo() {
  await mongoose.disconnect();
}

/**
 * Redact password from a MongoDB URI (for logs).
 * @param {string} uri
 * @returns {string}
 */
function safeMongoUri(uri) {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@]+):([^@]+)@/i, '$1$2:****@');
}

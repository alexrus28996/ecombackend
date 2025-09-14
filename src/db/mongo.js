import mongoose from 'mongoose';
import { getLogger } from '../logger.js';

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
    await mongoose.connect(uri, { maxPoolSize: 10, dbName: options.dbName || undefined });
    log.info({ uri: safeMongoUri(uri) }, 'MongoDB connected');
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

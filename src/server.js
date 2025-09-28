import { config } from './config/index.js';
import { createApp } from './app.js';
import { connectMongo } from './db/mongo.js';
import { ensureDefaultLocation } from './modules/inventory/services/location.service.js';

/**
 * Application entry point: connect DB and start HTTP server.
 */
async function main() {
  const app = createApp();
  await connectMongo(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  await ensureDefaultLocation();
  app.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`${config.APP_NAME} listening on port ${config.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});

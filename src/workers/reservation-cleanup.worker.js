import 'dotenv/config';
import { config } from '../config/index.js';
import { connectMongo, disconnectMongo } from '../db/mongo.js';
import { expireStaleReservations } from '../modules/inventory/reservation.service.js';
import { getLogger } from '../logger.js';

const logger = getLogger().child({ worker: 'reservation-cleanup' });
let timer;

async function runSweep() {
  try {
    const result = await expireStaleReservations();
    if (result.expired) {
      logger.info({ event: 'reservation.cleanup', expired: result.expired }, 'Expired reservations released');
    } else {
      logger.debug({ event: 'reservation.cleanup' }, 'No reservations expired in this cycle');
    }
  } catch (err) {
    logger.error({ err, event: 'reservation.cleanup.error' }, 'Failed to expire reservations');
  }
}

async function bootstrap() {
  await connectMongo(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  logger.info({ event: 'reservation.cleanup.start' }, 'Reservation cleanup worker started');
  await runSweep();
  const intervalMs = Math.max(30_000, Number(config.RESERVATION_SWEEP_INTERVAL_MS || 60_000));
  timer = setInterval(runSweep, intervalMs);
}

bootstrap().catch(async (err) => {
  logger.error({ err }, 'Reservation cleanup worker failed to start');
  await disconnectMongo();
  process.exit(1);
});

async function shutdown() {
  if (timer) clearInterval(timer);
  await disconnectMongo();
  logger.info({ event: 'reservation.cleanup.stop' }, 'Reservation cleanup worker stopped');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

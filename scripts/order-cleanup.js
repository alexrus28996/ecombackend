import 'dotenv/config';
import { config } from '../src/config/index.js';
import { connectMongo, disconnectMongo } from '../src/db/mongo.js';
import { Order } from '../src/modules/orders/order.model.js';
import { addTimeline } from '../src/modules/orders/timeline.service.js';
import { t } from '../src/i18n/index.js';
import { releaseOrderReservations } from '../src/modules/inventory/reservation.service.js';

async function main() {
  const minutes = Number(config.ORDER_AUTO_CANCEL_MINUTES) || 120;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  await connectMongo(config.MONGO_URI, { dbName: config.DB_NAME || undefined });

  const orders = await Order.find({ status: 'pending', paymentStatus: 'unpaid', createdAt: { $lt: cutoff } }).limit(500);
  if (!orders.length) {
    console.log('No stale unpaid orders to cancel.');
    await disconnectMongo();
    return;
  }

  let processed = 0;
  for (const ord of orders) {
    try {
      await releaseOrderReservations(ord._id, { reason: 'expired', notes: 'auto-cancel script' });
      ord.status = 'cancelled';
      await ord.save();
      await addTimeline(ord._id, { type: 'auto_cancel', message: t('timeline.auto_cancel', { minutes }) });
      processed++;
    } catch (e) {
      console.error('Failed to cancel order', ord._id.toString(), e.message);
    }
  }
  console.log(`Auto-cancelled ${processed}/${orders.length} orders older than ${minutes} minutes.`);
  await disconnectMongo();
}

main().catch((err) => { console.error(err); process.exit(1); });

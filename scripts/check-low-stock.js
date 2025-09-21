import 'dotenv/config';
import { config } from '../src/config/index.js';
import { connectMongo, disconnectMongo } from '../src/db/mongo.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { sendEmail } from '../src/utils/email.js';

async function main() {
  await connectMongo(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const threshold = config.LOW_STOCK_THRESHOLD;
  const low = await StockItem.find({ $expr: { $lte: [{ $subtract: ['$onHand', '$reserved'] }, threshold] } }).limit(200).lean();
  if (low.length === 0) {
    console.log('No low-stock items.');
    await disconnectMongo();
    return;
  }
  const lines = ['Low-stock items:'];
  const locationIds = [...new Set(low.map((it) => String(it.locationId)))];
  const locations = await Location.find({ _id: { $in: locationIds } }).lean();
  const locationMap = new Map(locations.map((loc) => [String(loc._id), loc]));
  for (const it of low) {
    const p = await Product.findById(it.product).lean();
    const name = p?.name || String(it.product);
    const location = locationMap.get(String(it.locationId));
    const label = location?.code || location?.name || 'unknown';
    const available = Math.max(0, Number(it.onHand || 0) - Number(it.reserved || 0));
    lines.push(`- ${name} ${it.variantId ? `(variant ${it.variantId})` : ''} @ ${label}: ${available}`);
  }
  const body = lines.join('\n');
  console.log(body);
  if (config.ALERT_EMAIL) {
    await sendEmail({ to: config.ALERT_EMAIL, subject: 'Low stock alert', text: body });
  }
  await disconnectMongo();
}

main().catch((err) => { console.error(err); process.exit(1); });


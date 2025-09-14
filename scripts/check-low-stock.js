import 'dotenv/config';
import { config } from '../src/config/index.js';
import { connectMongo, disconnectMongo } from '../src/db/mongo.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { sendEmail } from '../src/utils/email.js';

async function main() {
  await connectMongo(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const threshold = config.LOW_STOCK_THRESHOLD;
  const low = await Inventory.find({ qty: { $lte: threshold } }).limit(200).lean();
  if (low.length === 0) {
    console.log('No low-stock items.');
    await disconnectMongo();
    return;
  }
  const lines = ['Low-stock items:'];
  for (const it of low) {
    const p = await Product.findById(it.product).lean();
    const name = p?.name || String(it.product);
    lines.push(`- ${name} ${it.variant ? `(variant ${it.variant})` : ''} @ ${it.location || 'default'}: ${it.qty}`);
  }
  const body = lines.join('\n');
  console.log(body);
  if (config.ALERT_EMAIL) {
    await sendEmail({ to: config.ALERT_EMAIL, subject: 'Low stock alert', text: body });
  }
  await disconnectMongo();
}

main().catch((err) => { console.error(err); process.exit(1); });


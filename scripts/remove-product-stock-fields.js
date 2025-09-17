#!/usr/bin/env node
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Product } from '../src/modules/catalog/product.model.js';

async function main() {
  await mongoose.connect(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const res = await Product.updateMany({}, { $unset: { stock: '', 'variants.$[].stock': '' } });
  // eslint-disable-next-line no-console
  console.log('Stock fields removed. Matched:', res.matchedCount ?? res.n, 'Modified:', res.modifiedCount ?? res.nModified);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


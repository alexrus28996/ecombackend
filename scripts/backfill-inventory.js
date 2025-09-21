#!/usr/bin/env node
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';

async function main() {
  await mongoose.connect(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const products = await Product.find({}).lean();
  let defaultLocation = await Location.findOne({ code: 'DEFAULT' });
  if (!defaultLocation) {
    defaultLocation = await Location.create({ code: 'DEFAULT', name: 'Primary Warehouse', type: 'WAREHOUSE', priority: 5, active: true });
  }
  let created = 0;
  for (const p of products) {
    const baseInv = await StockItem.findOne({ productId: p._id, variantId: null, locationId: defaultLocation._id });
    if (!baseInv) {
      await StockItem.create({ productId: p._id, variantId: null, locationId: defaultLocation._id, onHand: Number(p.stock || 0), reserved: 0 });
      created++;
    }
    for (const v of (p.variants || [])) {
      const vinv = await StockItem.findOne({ productId: p._id, variantId: v._id, locationId: defaultLocation._id });
      if (!vinv) {
        await StockItem.create({ productId: p._id, variantId: v._id, locationId: defaultLocation._id, onHand: Number(v.stock || 0), reserved: 0 });
        created++;
      }
    }
  }
  console.log(`Backfill complete. Inventory records created: ${created}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


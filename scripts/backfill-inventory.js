#!/usr/bin/env node
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';

async function main() {
  await mongoose.connect(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const products = await Product.find({}).lean();
  let created = 0;
  for (const p of products) {
    const baseInv = await Inventory.findOne({ product: p._id, variant: null, location: null });
    if (!baseInv) {
      await Inventory.create({ product: p._id, variant: null, location: null, qty: Number(p.stock || 0), sku: p.sku || undefined });
      created++;
    }
    for (const v of (p.variants || [])) {
      const vinv = await Inventory.findOne({ product: p._id, variant: v._id, location: null });
      if (!vinv) {
        await Inventory.create({ product: p._id, variant: v._id, location: null, qty: Number(v.stock || 0), sku: v.sku || undefined });
        created++;
      }
    }
  }
  console.log(`Backfill complete. Inventory records created: ${created}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


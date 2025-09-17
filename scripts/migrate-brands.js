#!/usr/bin/env node
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Brand } from '../src/modules/catalog/brand.model.js';
import slugify from 'slugify';

async function main() {
  await mongoose.connect(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const products = await Product.find({ brand: { $type: 'string' } }).lean();
  let created = 0, updated = 0;
  for (const p of products) {
    const name = String(p.brand).trim();
    if (!name) continue;
    const slug = slugify(name, { lower: true, strict: true });
    let b = await Brand.findOne({ slug });
    if (!b) { b = await Brand.create({ name, slug }); created++; }
    await Product.updateOne({ _id: p._id }, { $set: { brand: b._id } });
    updated++;
  }
  console.log(`Brands migrated. created=${created} productsUpdated=${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


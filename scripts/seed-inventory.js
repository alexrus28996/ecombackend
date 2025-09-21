#!/usr/bin/env node
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';
import { Product } from '../src/modules/catalog/product.model.js';

async function ensureLocation({ code, name, type, geo, priority }) {
  let loc = await Location.findOne({ code });
  if (!loc) {
    loc = await Location.create({ code, name, type, geo, priority, active: true });
    console.log(`Created location ${code}`);
  }
  return loc;
}

async function main() {
  await mongoose.connect(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  const delhi = await ensureLocation({
    code: 'DEL_WHS',
    name: 'Delhi Warehouse',
    type: 'WAREHOUSE',
    geo: { lat: 28.6139, lng: 77.2090, country: 'IN', region: 'Delhi', pincode: '110001' },
    priority: 10
  });
  const mumbai = await ensureLocation({
    code: 'BOM_WHS',
    name: 'Mumbai Fulfillment Center',
    type: 'WAREHOUSE',
    geo: { lat: 19.0760, lng: 72.8777, country: 'IN', region: 'Maharashtra', pincode: '400001' },
    priority: 8
  });
  const products = await Product.find({ isActive: true }).limit(5).lean();
  for (const product of products) {
    const existsDelhi = await StockItem.findOne({ productId: product._id, locationId: delhi._id });
    if (!existsDelhi) {
      await StockItem.create({ productId: product._id, locationId: delhi._id, onHand: 25, reserved: 0 });
    }
    const existsMumbai = await StockItem.findOne({ productId: product._id, locationId: mumbai._id });
    if (!existsMumbai) {
      await StockItem.create({ productId: product._id, locationId: mumbai._id, onHand: 15, reserved: 0 });
    }
  }
  console.log(`Seeded ${products.length} products across Delhi & Mumbai warehouses.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

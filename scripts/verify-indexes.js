#!/usr/bin/env node
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { PaymentTransaction } from '../src/modules/payments/payment-transaction.model.js';
import { Refund } from '../src/modules/payments/refund.model.js';
import { Shipment } from '../src/modules/orders/shipment.model.js';

async function showIndexes(model, name) {
  const indexes = await model.collection.indexes();
  // eslint-disable-next-line no-console
  console.log(name, indexes.map(i => i.key));
}

async function main() {
  await mongoose.connect(config.MONGO_URI, { dbName: config.DB_NAME || undefined });
  await showIndexes(Product, 'Product');
  await showIndexes(Order, 'Order');
  await showIndexes(Inventory, 'Inventory');
  await showIndexes(Review, 'Review');
  await showIndexes(Category, 'Category');
  await showIndexes(PaymentTransaction, 'PaymentTransaction');
  await showIndexes(Refund, 'Refund');
  await showIndexes(Shipment, 'Shipment');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

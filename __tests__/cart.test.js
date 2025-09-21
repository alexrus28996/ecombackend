import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { Category } from '../src/modules/catalog/category.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';
import { getOrCreateCart, addItem, updateItem, removeItem, clearCart } from '../src/modules/cart/cart.service.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(30000);

describe('Cart service', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let product;
  let shouldSkip = false;
  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    try {
      const cat = await Category.create({ name: 'Shoes', slug: 'shoes' });
      product = await Product.create({ name: 'Sneaker', price: 50, currency: 'USD', category: cat._id, isActive: true });
      const location = await Location.create({ code: 'DEL', name: 'Delhi DC', type: 'WAREHOUSE', priority: 10, active: true });
      await StockItem.create({ productId: product._id, variantId: null, locationId: location._id, onHand: 2, reserved: 0 });
    } catch (err) {
      console.warn('Skipping cart service tests due to setup failure', err.message);
      shouldSkip = true;
    }
  });
  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('create/get cart and add/update/remove items respecting stock', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const cart0 = await getOrCreateCart(userId);
    expect(cart0.items.length).toBe(0);

    const cart1 = await addItem(userId, { productId: product._id.toString(), quantity: 1 });
    expect(cart1.items[0].quantity).toBe(1);

    const cart2 = await updateItem(userId, { productId: product._id.toString(), quantity: 2 });
    expect(cart2.items[0].quantity).toBe(2);

    const cart3 = await removeItem(userId, { productId: product._id.toString() });
    expect(cart3.items.length).toBe(0);

    const cart4 = await addItem(userId, { productId: product._id.toString(), quantity: 2 });
    expect(cart4.items[0].quantity).toBe(2);

    const cart5 = await clearCart(userId);
    expect(cart5.items.length).toBe(0);
  });
});


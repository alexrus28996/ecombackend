import mongoose from 'mongoose';
import { Category } from '../src/modules/catalog/category.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { getOrCreateCart, addItem, updateItem, removeItem, clearCart } from '../src/modules/cart/cart.service.js';

describe('Cart service', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let product;
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    await mongoose.connection.db.dropDatabase();
    const cat = await Category.create({ name: 'Shoes', slug: 'shoes' });
    product = await Product.create({ name: 'Sneaker', price: 50, currency: 'USD', category: cat._id, isActive: true });
    await Inventory.create({ product: product._id, variant: null, location: null, qty: 2 });
  });
  afterAll(async () => { await mongoose.disconnect(); });

  test('create/get cart and add/update/remove items respecting stock', async () => {
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


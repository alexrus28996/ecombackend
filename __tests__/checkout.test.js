import mongoose from 'mongoose';
import { Category } from '../src/modules/catalog/category.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { Cart } from '../src/modules/cart/cart.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { addItem } from '../src/modules/cart/cart.service.js';
 import { Address } from '../src/modules/users/address.model.js';
import { createOrderFromCart } from '../src/modules/orders/order.service.js';

describe('Cart -> Order flow (integration)', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let category;
  let product;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    await mongoose.connection.db.dropDatabase();
    category = await Category.create({ name: 'Shirts', slug: 'shirts' });
    product = await Product.create({ name: 'Tee', price: 20, currency: 'USD', category: category._id, isActive: true });
    await Inventory.create({ product: product._id, variant: null, location: null, qty: 5 });
    // default addresses
    await Address.create({ user: userId, type: 'shipping', fullName: 'Ship User', line1: 'S1', city: 'SC', country: 'US', isDefault: true });
    await Address.create({ user: userId, type: 'billing', fullName: 'Bill User', line1: 'B1', city: 'BC', country: 'US', isDefault: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('add to cart respects stock and creates order with invoice', async () => {
    const cart = await addItem(userId, { productId: product._id.toString(), quantity: 2 });
    expect(cart.subtotal).toBe(40);
    expect(cart.items.length).toBe(1);

    const order = await createOrderFromCart(userId, {});
    expect(order.items.length).toBe(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.subtotal).toBe(40);
    // From jest.setup: free >= 50, flat 5; subtotal=40 => shipping=5, tax=6
    expect(order.shipping).toBe(5);
    expect(order.tax).toBe(6);
    expect(order.total).toBe(51);
    expect(order.invoiceNumber).toBeTruthy();
    expect(order.invoiceUrl).toMatch(/\/uploads\/invoices\/invoice-/);
    expect(order.shippingAddress?.line1).toBe('S1');
    expect(order.billingAddress?.line1).toBe('B1');

    const inv = await Inventory.findOne({ product: product._id, variant: null, location: null });
    expect(inv.qty).toBe(3);

    const freshCart = await Cart.findOne({ user: userId });
    expect(freshCart.items.length).toBe(0);
    expect(freshCart.status).not.toBe('ACTIVE');

    const savedOrder = await Order.findById(order._id);
    expect(savedOrder).toBeTruthy();
  });
});

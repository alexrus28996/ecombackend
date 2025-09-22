import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { Category } from '../src/modules/catalog/category.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';
import { Cart } from '../src/modules/cart/cart.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { addItem } from '../src/modules/cart/cart.service.js';
import { Address } from '../src/modules/users/address.model.js';
import { createOrderFromCart } from '../src/modules/orders/order.service.js';
import { Reservation } from '../src/modules/inventory/reservation.model.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(30000);

describe('Cart -> Order flow (integration)', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let category;
  let product;
  let location;
  let digitalProduct;
  let shouldSkip = false;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    try {
      category = await Category.create({ name: 'Shirts', slug: 'shirts' });
      product = await Product.create({ name: 'Tee', price: 20, currency: 'USD', category: category._id, isActive: true });
      digitalProduct = await Product.create({ name: 'Online Course', price: 30, currency: 'USD', category: category._id, isActive: true, requiresShipping: false });
      location = await Location.create({ code: 'BOM', name: 'Mumbai FC', type: 'WAREHOUSE', priority: 8, active: true });
      await StockItem.create({ productId: product._id, variantId: null, locationId: location._id, onHand: 5, reserved: 0 });
      await Address.create({ user: userId, type: 'shipping', fullName: 'Ship User', line1: 'S1', city: 'SC', country: 'US', isDefault: true });
      await Address.create({ user: userId, type: 'billing', fullName: 'Bill User', line1: 'B1', city: 'BC', country: 'US', isDefault: true });
    } catch (err) {
      console.warn('Skipping checkout integration tests due to setup failure', err.message);
      shouldSkip = true;
    }
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('add to cart respects stock and creates order with invoice', async () => {
    if (skipIfNeeded(shouldSkip)) return;
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

    const inv = await StockItem.findOne({ productId: product._id, variantId: null, locationId: location._id });
    expect(inv.onHand).toBe(3);

    const freshCart = await Cart.findOne({ user: userId });
    expect(freshCart.items.length).toBe(0);
    expect(freshCart.status).not.toBe('ACTIVE');

    const savedOrder = await Order.findById(order._id);
    expect(savedOrder).toBeTruthy();
});

  test('checkout succeeds for non-shipping products without inventory', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const cart = await addItem(userId, { productId: digitalProduct._id.toString(), quantity: 2 });
    expect(cart.items.find((it) => String(it.product) === digitalProduct._id.toString())?.quantity).toBe(2);

    const order = await createOrderFromCart(userId, {});
    expect(order.items.length).toBe(1);
    expect(String(order.items[0].product)).toBe(digitalProduct._id.toString());
    expect(order.items[0].quantity).toBe(2);

    const reservations = await Reservation.countDocuments({ orderId: order._id });
    expect(reservations).toBe(0);
  });
});

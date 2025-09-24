import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { Category } from '../src/modules/catalog/category.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Coupon } from '../src/modules/coupons/coupon.model.js';
import { findValidCouponByCode } from '../src/modules/coupons/coupon.service.js';
import { Order } from '../src/modules/orders/order.model.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(30000);

describe('Coupon targeting & usage limits', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let category;
  let product;
  let shouldSkip = false;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    category = await Category.create({ name: 'Shoes', slug: 'shoes' });
    product = await Product.create({
      name: 'Sneaker',
      price: 100,
      currency: 'USD',
      category: category._id,
      isActive: true
    });
  });

  beforeEach(async () => {
    if (shouldSkip) return;
    await Promise.all([
      Coupon.deleteMany({}),
      Order.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('applies when cart products match include category', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await Coupon.create({
      code: 'SHOES10',
      type: 'percent',
      value: 10,
      includeCategories: [category._id]
    });
    const coupon = await findValidCouponByCode('shoes10', {
      subtotal: 150,
      userId,
      productIds: [product._id]
    });
    expect(coupon).not.toBeNull();
    expect(coupon?.code).toBe('SHOES10');
  });

  test('rejects when excluded product exists in cart', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await Coupon.create({
      code: 'EXCLUDE',
      type: 'fixed',
      value: 5,
      excludeProducts: [product._id]
    });
    const coupon = await findValidCouponByCode('EXCLUDE', {
      subtotal: 100,
      userId,
      productIds: [product._id]
    });
    expect(coupon).toBeNull();
  });

  test('enforces per-user and global redemption limits', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const limitCoupon = await Coupon.create({
      code: 'LIMIT1',
      type: 'fixed',
      value: 10,
      perUserLimit: 1,
      globalLimit: 2
    });
    await Order.create({
      user: userId,
      items: [{
        product: product._id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        quantity: 1
      }],
      subtotal: product.price,
      discount: 10,
      couponCode: limitCoupon.code,
      total: product.price - 10,
      currency: product.currency
    });
    const blockedForUser = await findValidCouponByCode('LIMIT1', {
      subtotal: 120,
      userId,
      productIds: [product._id]
    });
    expect(blockedForUser).toBeNull();

    const otherUserId = new mongoose.Types.ObjectId().toString();
    const allowedOther = await findValidCouponByCode('LIMIT1', {
      subtotal: 120,
      userId: otherUserId,
      productIds: [product._id]
    });
    expect(allowedOther).not.toBeNull();

    await Order.create({
      user: otherUserId,
      items: [{
        product: product._id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        quantity: 1
      }],
      subtotal: product.price,
      discount: 10,
      couponCode: limitCoupon.code,
      total: product.price - 10,
      currency: product.currency
    });

    const thirdUserId = new mongoose.Types.ObjectId().toString();
    const blockedAfterGlobal = await findValidCouponByCode('LIMIT1', {
      subtotal: 120,
      userId: thirdUserId,
      productIds: [product._id]
    });
    expect(blockedAfterGlobal).toBeNull();
  });
});

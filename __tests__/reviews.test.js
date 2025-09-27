import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { Product } from '../src/modules/catalog/product.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { upsertReview, deleteReview, moderateReview, listProductReviews } from '../src/modules/reviews/review.service.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../src/config/constants.js';

jest.setTimeout(30000);

describe('Product reviews service', () => {
  let shouldSkip = false;
  let product;
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    product = await Product.create({ name: 'Sneaker', price: 99, currency: 'USD', isActive: true });
    await Order.create({
      user: userId,
      items: [{ product: product._id, name: 'Sneaker', price: 99, currency: 'USD', quantity: 1 }],
      subtotal: 99,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 99,
      currency: 'USD',
      status: ORDER_STATUS.PAID,
      paymentStatus: PAYMENT_STATUS.PAID,
      paidAt: new Date()
    });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('upsert, moderation, and deletion update product rating aggregates', async () => {
    if (skipIfNeeded(shouldSkip)) return;

    const created = await upsertReview(product._id, userId.toString(), { rating: 5, comment: 'Fantastic' });
    expect(created.rating).toBe(5);
    expect(created.isApproved).toBe(true);
    expect(created.verifiedPurchase).toBe(true);

    const firstSnapshot = await Product.findById(product._id).lean();
    expect(firstSnapshot.ratingAvg).toBe(5);
    expect(firstSnapshot.ratingCount).toBe(1);

    const secondReview = await upsertReview(product._id, otherUserId.toString(), { rating: 3, comment: 'Okayish' });
    expect(secondReview.verifiedPurchase).toBe(false);
    const secondSnapshot = await Product.findById(product._id).lean();
    expect(secondSnapshot.ratingAvg).toBe(4);
    expect(secondSnapshot.ratingCount).toBe(2);

    await moderateReview(secondReview._id, { approve: false });
    const afterHide = await Product.findById(product._id).lean();
    expect(afterHide.ratingAvg).toBe(5);
    expect(afterHide.ratingCount).toBe(1);

    const approvedList = await listProductReviews(product._id, { limit: 10, page: 1 });
    expect(approvedList.items).toHaveLength(1);
    const allList = await listProductReviews(product._id, { limit: 10, page: 1, includeUnapproved: true });
    expect(allList.items).toHaveLength(2);

    await deleteReview(product._id, created._id, { userId: userId.toString(), isAdmin: false });
    const afterDelete = await Product.findById(product._id).lean();
    expect(afterDelete.ratingAvg).toBe(0);
    expect(afterDelete.ratingCount).toBe(0);
  });
});

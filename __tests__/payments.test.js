import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { Product } from '../src/modules/catalog/product.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';
import { Reservation } from '../src/modules/inventory/reservation.model.js';
import { PaymentTransaction } from '../src/modules/payments/payment-transaction.model.js';
import { PaymentEvent } from '../src/modules/payments/payment-event.model.js';
import { createPaymentIntentForOrder, applyPaymentIntentSucceeded } from '../src/modules/payments/stripe.service.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';
import { ERROR_CODES } from '../src/errors/codes.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../src/config/constants.js';

jest.setTimeout(30000);

describe('Stripe payments integration', () => {
  let shouldSkip = false;
  let product;
  let location;
  let order;
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    product = await Product.create({ name: 'Desk Lamp', price: 50, currency: 'USD', isActive: true });
    location = await Location.create({ code: 'W1', name: 'Primary Warehouse', type: 'WAREHOUSE', active: true, priority: 10 });
    await StockItem.create({ productId: product._id, variantId: null, locationId: location._id, onHand: 5, reserved: 1 });
    order = await Order.create({
      user: userId,
      items: [{ product: product._id, name: 'Desk Lamp', price: 50, currency: 'USD', quantity: 1 }],
      subtotal: 50,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 50,
      currency: 'USD',
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.UNPAID
    });
    await Reservation.create({
      orderId: order._id,
      userId,
      productId: product._id,
      variantId: null,
      locationId: location._id,
      reservedQty: 1,
      status: 'active',
      expiryTimestamp: new Date(Date.now() + 30 * 60 * 1000)
    });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('intent creation guard returns service unavailable when Stripe is disabled', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await expect(createPaymentIntentForOrder(order._id, userId.toString())).rejects.toMatchObject({
      status: 503,
      code: ERROR_CODES.PAYMENTS_NOT_CONFIGURED
    });
  });

  test('payment success marks order paid and converts reservations', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await applyPaymentIntentSucceeded({
      id: 'pi_test_123',
      type: 'payment_intent.succeeded',
      amount_received: 5000,
      currency: 'usd',
      metadata: { orderId: order._id.toString(), userId: userId.toString() }
    });

    const refreshed = await Order.findById(order._id);
    expect(refreshed.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    expect(refreshed.status).toBe(ORDER_STATUS.PAID);
    expect(refreshed.transactionId).toBe('pi_test_123');
    expect(refreshed.paymentProvider).toBe('stripe');
    expect(refreshed.paidAt).toBeInstanceOf(Date);

    const reservations = await Reservation.find({ orderId: order._id });
    expect(reservations.every((res) => res.status === 'converted')).toBe(true);

    const stock = await StockItem.findOne({ productId: product._id, locationId: location._id });
    expect(stock.onHand).toBe(4);
    expect(stock.reserved).toBe(0);

    const tx = await PaymentTransaction.findOne({ order: order._id, providerRef: 'pi_test_123' });
    expect(tx).toBeTruthy();
    const event = await PaymentEvent.findOne({ eventId: 'pi_test_123' });
    expect(event).toBeTruthy();
  });
});

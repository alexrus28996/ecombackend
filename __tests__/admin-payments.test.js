import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { listTransactionsController, listRefundsAdminController, getTransactionController, getRefundAdminController } from '../src/interfaces/http/controllers/admin.controller.js';
import { applyPaymentIntentSucceeded, applyStripeRefundEvent } from '../src/modules/payments/stripe.service.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { PaymentTransaction } from '../src/modules/payments/payment-transaction.model.js';
import { Refund } from '../src/modules/payments/refund.model.js';
import { createMockRes } from './helpers/mock-res.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../src/config/constants.js';

jest.setTimeout(30000);

describe('Admin payment datasets', () => {
  let shouldSkip = false;
  let order;
  let userId;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('returns empty transactions dataset when no orders exist', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = { query: {} };
    const res = createMockRes();

    await listTransactionsController(req, res);

    expect(res.json).toHaveBeenCalledWith({ items: [], total: 0, page: 1, pages: 0 });
  });

  test('records Stripe payment and lists transaction', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const product = await Product.create({ name: 'Monitor', price: 50, currency: 'USD', isActive: true });
    order = await Order.create({
      user: userId,
      items: [{ product: product._id, name: 'Monitor', price: 50, currency: 'USD', quantity: 1 }],
      subtotal: 50,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 50,
      currency: 'USD',
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.UNPAID
    });

    await applyPaymentIntentSucceeded({
      id: 'pi_admin_1',
      type: 'payment_intent.succeeded',
      amount_received: 5000,
      currency: 'usd',
      metadata: { orderId: order._id.toString(), userId: userId.toString() }
    });

    const req = { query: { orderId: order._id.toString() } };
    const res = createMockRes();

    await listTransactionsController(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.total).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].provider).toBe('stripe');
    expect(payload.items[0].providerRef).toBe('pi_admin_1');
    expect(payload.pages).toBe(1);

    const txRes = createMockRes();
    await getTransactionController({ params: { id: payload.items[0]._id.toString() } }, txRes);
    expect(txRes.json).toHaveBeenCalledWith({ transaction: expect.objectContaining({ providerRef: 'pi_admin_1' }) });
  });

  test('records Stripe refund and lists dataset', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await applyStripeRefundEvent({
      id: 'evt_refund_1',
      type: 'refund.succeeded',
      data: {
        object: {
          id: 're_1',
          amount: 5000,
          currency: 'usd',
          status: 'succeeded',
          payment_intent: 'pi_admin_1',
          metadata: { orderId: order._id.toString() }
        }
      }
    });

    const req = { query: { orderId: order._id.toString() } };
    const res = createMockRes();
    await listRefundsAdminController(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.total).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].providerRef).toBe('re_1');
    expect(payload.pages).toBe(1);

    const refundRes = createMockRes();
    await getRefundAdminController({ params: { id: payload.items[0]._id.toString() } }, refundRes);
    expect(refundRes.json).toHaveBeenCalledWith({ refund: expect.objectContaining({ providerRef: 're_1', status: 'succeeded' }) });

    const refreshedOrder = await Order.findById(order._id);
    expect(refreshedOrder.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
    expect(refreshedOrder.status).toBe(ORDER_STATUS.REFUNDED);

    const tx = await PaymentTransaction.findOne({ order: order._id });
    expect(tx.status).toBe('refunded');
    const refundDoc = await Refund.findOne({ order: order._id });
    expect(refundDoc).toBeTruthy();
  });
});

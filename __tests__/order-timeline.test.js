import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { Order } from '../src/modules/orders/order.model.js';
import { listTimeline } from '../src/modules/orders/timeline.service.js';
import { createTimelineEntry } from '../src/interfaces/http/controllers/order-timeline.controller.js';
import { createMockRes } from './helpers/mock-res.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Order timeline controller', () => {
  let shouldSkip = false;
  let order;
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    order = await Order.create({
      user: userId,
      items: [
        { product: new mongoose.Types.ObjectId(), name: 'Item', price: 20, currency: 'USD', quantity: 1 }
      ],
      subtotal: 20,
      total: 20,
      currency: 'USD'
    });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('adds manual timeline entry', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = {
      validated: { params: { id: order._id.toString() }, body: { type: 'note', message: 'Checked inventory' } },
      user: { sub: userId }
    };
    const res = createMockRes();
    await createTimelineEntry(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const timeline = await listTimeline(order._id, {});
    expect(timeline.items[0].message).toBe('Checked inventory');
  });

  test('throws for missing order', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = {
      validated: { params: { id: new mongoose.Types.ObjectId().toString() }, body: { type: 'note', message: 'Missing' } },
      user: { sub: userId }
    };
    const res = createMockRes();
    await expect(createTimelineEntry(req, res)).rejects.toThrow('Order not found');
  });
});

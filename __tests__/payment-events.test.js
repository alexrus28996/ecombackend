import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { PaymentEvent } from '../src/modules/payments/payment-event.model.js';
import { listPaymentEvents, getPaymentEvent } from '../src/modules/payments/payment-event.service.js';
import checkPermission from '../src/middleware/checkPermission.js';
import { PERMISSIONS } from '../src/utils/permissions.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Payment events', () => {
  let shouldSkip = false;
  let eventId;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    const created = await PaymentEvent.create({ provider: 'stripe', eventId: 'evt_1', type: 'charge.succeeded' });
    eventId = created._id;
    await PaymentEvent.create({ provider: 'paypal', eventId: 'evt_2', type: 'payment.completed' });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('permission middleware enforces payment event scope', () => {
    const middleware = checkPermission(PERMISSIONS.PAYMENTS_EVENTS_VIEW);
    const req = { user: { roles: [], permissions: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    middleware(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('lists events filtered by provider', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const result = await listPaymentEvents({ provider: 'stripe' });
    expect(result.total).toBe(1);
    expect(result.items[0].provider).toBe('stripe');
  });

  test('fetches event or throws when missing', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const event = await getPaymentEvent(eventId.toString());
    expect(event.eventId).toBe('evt_1');
    await expect(getPaymentEvent(new mongoose.Types.ObjectId().toString())).rejects.toThrow('Payment event not found');
  });
});

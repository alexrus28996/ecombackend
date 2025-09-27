import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createShipmentController, listShipmentsController, getShipmentController, listOrderShipmentsController } from '../src/interfaces/http/controllers/admin.controller.js';
import { Product } from '../src/modules/catalog/product.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { Shipment } from '../src/modules/orders/shipment.model.js';
import { createMockRes } from './helpers/mock-res.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../src/config/constants.js';

jest.setTimeout(30000);

describe('Admin shipments', () => {
  let shouldSkip = false;
  let paidOrder;
  let unpaidOrder;
  let product;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    product = await Product.create({ name: 'Chair', price: 80, currency: 'USD', isActive: true });
    unpaidOrder = await Order.create({
      user: new mongoose.Types.ObjectId(),
      items: [{ product: product._id, name: 'Chair', price: 80, currency: 'USD', quantity: 1 }],
      subtotal: 80,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 80,
      currency: 'USD',
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.UNPAID
    });
    paidOrder = await Order.create({
      user: new mongoose.Types.ObjectId(),
      items: [{ product: product._id, name: 'Chair', price: 80, currency: 'USD', quantity: 1 }],
      subtotal: 80,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 80,
      currency: 'USD',
      status: ORDER_STATUS.PAID,
      paymentStatus: PAYMENT_STATUS.PAID
    });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('rejects shipment creation for unpaid orders', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = { params: { id: unpaidOrder._id.toString() }, validated: { body: {} } };
    const res = createMockRes();

    await createShipmentController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: 'Order must be paid before creating shipments' }) }));
  });

  test('creates shipment for paid order and lists it', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = {
      params: { id: paidOrder._id.toString() },
      validated: { body: { carrier: 'DHL', tracking: 'TRACK123' } },
      user: { sub: 'admin-user' },
      log: { warn: jest.fn() }
    };
    const res = createMockRes();

    await createShipmentController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.shipment.carrier).toBe('DHL');
    expect(payload.shipment.items).toHaveLength(1);
    expect(payload.shipment.items[0].product.toString()).toBe(product._id.toString());

    const listRes = createMockRes();
    await listShipmentsController({ query: { orderId: paidOrder._id.toString() } }, listRes);
    const listPayload = listRes.json.mock.calls[0][0];
    expect(listPayload.total).toBe(1);
    expect(listPayload.items).toHaveLength(1);

    const getRes = createMockRes();
    await getShipmentController({ params: { id: payload.shipment._id.toString() } }, getRes);
    expect(getRes.json).toHaveBeenCalledWith({ shipment: expect.objectContaining({ tracking: 'TRACK123' }) });

    const listOrderRes = createMockRes();
    await listOrderShipmentsController({ validated: { params: { id: paidOrder._id.toString() } }, query: {} }, listOrderRes);
    const listOrderPayload = listOrderRes.json.mock.calls[0][0];
    expect(listOrderPayload.total).toBe(1);
    expect(listOrderPayload.items[0]._id.toString()).toBe(payload.shipment._id.toString());

    const storedShipment = await Shipment.findOne({ order: paidOrder._id });
    expect(storedShipment.tracking).toBe('TRACK123');
  });
});

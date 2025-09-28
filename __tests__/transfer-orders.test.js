import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  createTransferOrder,
  updateTransferOrder,
  transitionTransferOrder,
  listTransferOrders,
  getTransferOrderById,
  adjustStockLevels
} from '../src/modules/inventory/services/stock.service.js';
import { createLocation } from '../src/modules/inventory/services/location.service.js';
import { StockItem } from '../src/modules/inventory/models/stock-item.model.js';
import { Product } from '../src/modules/catalog/product.model.js';
import checkPermission from '../src/middleware/checkPermission.js';
import { PERMISSIONS } from '../src/utils/permissions.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Transfer orders', () => {
  let shouldSkip = false;
  let fromLocation;
  let toLocation;
  let product;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    [fromLocation, toLocation] = await Promise.all([
      createLocation({ code: 'FROM', name: 'From Warehouse' }),
      createLocation({ code: 'TO', name: 'To Warehouse' })
    ]);
    product = await Product.create({ name: 'Widget', price: 10 });
    await adjustStockLevels({
      adjustments: [
        { productId: product._id, variantId: null, locationId: fromLocation._id, qtyChange: 20 }
      ],
      reason: 'ADJUSTMENT',
      actor: new mongoose.Types.ObjectId().toString()
    });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('permission middleware enforces transfer scope', () => {
    const middleware = checkPermission(PERMISSIONS.INVENTORY_TRANSFER_VIEW);
    const req = { user: { roles: [], permissions: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    middleware(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('creates, updates, transitions transfer order', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const transfer = await createTransferOrder({
      fromLocationId: fromLocation._id,
      toLocationId: toLocation._id,
      lines: [{ productId: product._id, qty: 5 }],
      metadata: { note: 'restock' }
    });
    expect(transfer.status).toBe('DRAFT');

    const updated = await updateTransferOrder({
      id: transfer._id,
      metadata: { note: 'urgent' },
      lines: [{ productId: product._id, qty: 8 }]
    });
    expect(updated.lines[0].qty).toBe(8);

    const requested = await transitionTransferOrder({ id: transfer._id, nextStatus: 'REQUESTED' });
    expect(requested.status).toBe('REQUESTED');

    const inTransit = await transitionTransferOrder({ id: transfer._id, nextStatus: 'IN_TRANSIT' });
    expect(inTransit.status).toBe('IN_TRANSIT');
    const sourceStock = await StockItem.findOne({ productId: product._id, locationId: fromLocation._id });
    expect(sourceStock.onHand).toBe(12);

    const received = await transitionTransferOrder({ id: transfer._id, nextStatus: 'RECEIVED' });
    expect(received.status).toBe('RECEIVED');
    const destStock = await StockItem.findOne({ productId: product._id, locationId: toLocation._id });
    expect(destStock.onHand).toBe(8);

    await expect(transitionTransferOrder({ id: transfer._id, nextStatus: 'CANCELLED' })).rejects.toThrow('Invalid state');

    const listed = await listTransferOrders({ status: 'RECEIVED' });
    expect(listed.total).toBe(1);

    const fetched = await getTransferOrderById(transfer._id);
    expect(fetched.metadata.note).toBe('urgent');

    await expect(updateTransferOrder({ id: transfer._id, metadata: { note: 'nope' } })).rejects.toThrow('Only DRAFT');
  });

  test('cancel in-transit restores stock', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const transfer = await createTransferOrder({
      fromLocationId: fromLocation._id,
      toLocationId: toLocation._id,
      lines: [{ productId: product._id, qty: 4 }]
    });
    await transitionTransferOrder({ id: transfer._id, nextStatus: 'REQUESTED' });
    await transitionTransferOrder({ id: transfer._id, nextStatus: 'IN_TRANSIT' });
    await transitionTransferOrder({ id: transfer._id, nextStatus: 'CANCELLED' });
    const sourceStock = await StockItem.findOne({ productId: product._id, locationId: fromLocation._id });
    expect(sourceStock.onHand).toBe(12); // back to previous total
  });
});

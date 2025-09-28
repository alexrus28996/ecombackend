import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { listStockLedgerEntries, getStockLedgerEntry, adjustStockLevels } from '../src/modules/inventory/services/stock.service.js';
import { createLocation } from '../src/modules/inventory/services/location.service.js';
import { Product } from '../src/modules/catalog/product.model.js';
import checkPermission from '../src/middleware/checkPermission.js';
import { PERMISSIONS } from '../src/utils/permissions.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Inventory ledger', () => {
  let shouldSkip = false;
  let location;
  let product;
  let entryId;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    location = await createLocation({ code: 'LEDGER', name: 'Ledger Warehouse' });
    product = await Product.create({ name: 'Ledger Item', price: 5 });
    const actor = new mongoose.Types.ObjectId().toString();
    await adjustStockLevels({
      adjustments: [
        { productId: product._id, variantId: null, locationId: location._id, qtyChange: 3 }
      ],
      reason: 'ADJUSTMENT',
      actor,
      refType: 'ADJUSTMENT',
      refId: 'adjust-1'
    });
    const result = await listStockLedgerEntries({ productId: product._id.toString() });
    entryId = result.items[0]._id;
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('permission middleware enforces ledger scope', () => {
    const middleware = checkPermission(PERMISSIONS.INVENTORY_LEDGER_VIEW);
    const req = { user: { roles: [], permissions: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    middleware(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('adjust stock validation guards required fields', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await expect(
      adjustStockLevels({ adjustments: [], reason: 'ADJUSTMENT', actor: 'tester' })
    ).rejects.toThrow('adjustments array required');
  });

  test('lists ledger entries with filters', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const result = await listStockLedgerEntries({ productId: product._id.toString(), direction: 'IN' });
    expect(result.total).toBe(1);
    expect(result.items[0].direction).toBe('IN');
  });

  test('fetches entry or throws if missing', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const entry = await getStockLedgerEntry(entryId);
    expect(entry.productId.toString()).toBe(product._id.toString());
    await expect(getStockLedgerEntry(new mongoose.Types.ObjectId().toString())).rejects.toThrow('Ledger entry not found');
  });
});

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createLocation, listLocations, updateLocation, softDeleteLocation, restoreLocation } from '../src/modules/inventory/services/location.service.js';
import { Location } from '../src/modules/inventory/models/location.model.js';
import checkPermission from '../src/middleware/checkPermission.js';
import { PERMISSIONS } from '../src/utils/permissions.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Inventory locations', () => {
  let shouldSkip = false;
  let location;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    location = await createLocation({ code: 'LOC-1', name: 'Primary Warehouse', type: 'WAREHOUSE' });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('permission middleware rejects missing scope', () => {
    const middleware = checkPermission(PERMISSIONS.INVENTORY_LOCATION_VIEW);
    const req = { user: { roles: [], permissions: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    middleware(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test('fails validation when required fields are missing', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await expect(createLocation({ name: '' })).rejects.toThrow(/validation/i);
  });

  test('lists active locations and hides deleted by default', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const result = await listLocations({});
    expect(result.total).toBe(1);
    expect(result.items[0].code).toBe('LOC-1');
  });

  test('updates, soft deletes, and restores location', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const updated = await updateLocation(location._id, { name: 'Updated Warehouse', active: false });
    expect(updated.name).toBe('Updated Warehouse');
    expect(updated.active).toBe(false);

    const del = await softDeleteLocation(location._id);
    expect(del.deleted).toBe(true);

    const activeList = await listLocations({});
    expect(activeList.total).toBe(0);

    const deletedList = await listLocations({ state: 'deleted' });
    expect(deletedList.total).toBe(1);

    const restored = await restoreLocation(location._id);
    expect(restored.deletedAt).toBeNull();

    const refreshed = await Location.findById(location._id);
    expect(refreshed.deletedAt).toBeNull();
  });

  test('update non-existent location throws', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(updateLocation(fakeId, { name: 'Missing' })).rejects.toThrow('Location not found');
  });
});

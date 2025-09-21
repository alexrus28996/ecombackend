import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { Address } from '../src/modules/users/address.model.js';
import { createAddress, listAddresses, setDefaultAddress, updateAddress, deleteAddress } from '../src/modules/users/address.service.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

describe('Address book', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let shouldSkip = false;
  jest.setTimeout(10000);
  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
  });
  afterAll(async () => { await disconnectIfNeeded(shouldSkip); });

  test('create, set default, update, delete', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const a1 = await createAddress(userId, { type: 'shipping', line1: '123 A', city: 'City', country: 'US', isDefault: true });
    const a2 = await createAddress(userId, { type: 'shipping', line1: '456 B', city: 'City', country: 'US' });
    let list = await listAddresses(userId, { type: 'shipping' });
    expect(list.length).toBe(2);
    expect(list[0]._id.toString()).toBe(a1._id.toString());
    await setDefaultAddress(userId, a2._id);
    list = await listAddresses(userId, { type: 'shipping' });
    expect(list[0]._id.toString()).toBe(a2._id.toString());
    const upd = await updateAddress(userId, a2._id, { city: 'New City', isDefault: true });
    expect(upd.city).toBe('New City');
    const del = await deleteAddress(userId, a1._id);
    expect(del.success).toBe(true);
    const count = await Address.countDocuments({ user: userId });
    expect(count).toBe(1);
  });
});


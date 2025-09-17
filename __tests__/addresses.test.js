import mongoose from 'mongoose';
import { Address } from '../src/modules/users/address.model.js';
import { createAddress, listAddresses, setDefaultAddress, updateAddress, deleteAddress } from '../src/modules/users/address.service.js';

describe('Address book', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    await mongoose.connection.db.dropDatabase();
  });
  afterAll(async () => { await mongoose.disconnect(); });

  test('create, set default, update, delete', async () => {
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


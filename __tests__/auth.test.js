import mongoose from 'mongoose';
import { register, login, rotateRefreshToken, revokeRefreshToken } from '../src/modules/users/auth.service.js';
import { User } from '../src/modules/users/user.model.js';

describe('Auth service', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    await mongoose.connection.db.dropDatabase();
  });
  afterAll(async () => { await mongoose.disconnect(); });

  test('register first user as admin, next as customer; login works', async () => {
    const u1 = await register({ name: 'Alice', email: 'alice@example.com', password: 'Passw0rd!' });
    expect(u1.roles).toContain('admin');

    const u2 = await register({ name: 'Bob', email: 'bob@example.com', password: 'Passw0rd!' });
    expect(u2.roles).toContain('customer');

    const { token, refreshToken, user } = await login({ email: 'bob@example.com', password: 'Passw0rd!' });
    expect(typeof token).toBe('string');
    expect(typeof refreshToken).toBe('string');
    expect(user.email).toBe('bob@example.com');

    const rotated = await rotateRefreshToken(refreshToken, { ip: '127.0.0.1' });
    expect(typeof rotated.token).toBe('string');
    expect(typeof rotated.refreshToken).toBe('string');

    const revoke = await revokeRefreshToken(rotated.refreshToken, { ip: '127.0.0.1' });
    expect(revoke.success).toBe(true);

    // Invalid credentials for wrong password
    await expect(login({ email: 'bob@example.com', password: 'wrong' })).rejects.toBeTruthy();
    // Users exist in DB
    expect(await User.countDocuments({})).toBe(2);
  });
});


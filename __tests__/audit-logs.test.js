import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import { listAuditLogs, getAuditLog } from '../src/modules/audit/audit.service.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Audit log service', () => {
  let shouldSkip = false;
  let userId;
  let otherId;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    userId = new mongoose.Types.ObjectId();
    otherId = new mongoose.Types.ObjectId();
    await AuditLog.create([
      {
        user: userId,
        method: 'POST',
        path: '/api/admin/products',
        status: 201,
        body: { password: 'secret', nested: { token: 'abc123' } },
        params: { id: '123' },
        query: { Authorization: 'Bearer abc' }
      },
      {
        user: otherId,
        method: 'DELETE',
        path: '/api/admin/users',
        status: 204,
        body: { cardNumber: '4242 4242 4242 4242' },
        params: {},
        query: {}
      }
    ]);
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('lists logs with redacted sensitive fields', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const result = await listAuditLogs({});
    expect(result.total).toBe(2);
    const [first] = result.items;
    expect(first.body.password).toBe('[REDACTED]');
    expect(first.body.nested.token).toBe('[REDACTED]');
    expect(first.query.Authorization).toBe('[REDACTED]');
  });

  test('filters by user and method', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const result = await listAuditLogs({ user: userId.toString(), method: 'post' });
    expect(result.total).toBe(1);
    expect(result.items[0].user.toString()).toBe(userId.toString());
    expect(result.items[0].method).toBe('POST');
  });

  test('rejects invalid user filter', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await expect(listAuditLogs({ user: 'not-a-valid-id' })).rejects.toThrow(/Validation/i);
  });

  test('fetches single log or throws 404', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const all = await listAuditLogs({});
    const log = await getAuditLog(all.items[0]._id);
    expect(log.params.id).toBe('123');
    await expect(getAuditLog(new mongoose.Types.ObjectId().toString())).rejects.toThrow('Audit log not found');
  });
});

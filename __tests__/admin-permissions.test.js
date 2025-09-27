import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { getUserPermissionsController, replaceUserPermissionsController, addUserPermissionsController, removeUserPermissionsController } from '../src/interfaces/http/controllers/admin.controller.js';
import { User } from '../src/modules/users/user.model.js';
import { createMockRes } from './helpers/mock-res.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(20000);

describe('Admin permission management', () => {
  let shouldSkip = false;
  let user;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    user = await User.create({
      name: 'Perm User',
      email: `perm-${new mongoose.Types.ObjectId()}@example.com`,
      password: 'secret123'
    });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('lists default permissions', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = { validated: { params: { id: user._id.toString() } } };
    const res = createMockRes();

    await getUserPermissionsController(req, res);

    expect(res.json).toHaveBeenCalledWith({ userId: user._id.toString(), permissions: [] });
  });

  test('replaces permission set', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = {
      validated: {
        params: { id: user._id.toString() },
        body: { permissions: ['product:create', 'product:edit'] }
      }
    };
    const res = createMockRes();

    await replaceUserPermissionsController(req, res);

    expect(res.json).toHaveBeenCalledWith({ userId: user._id.toString(), permissions: ['product:create', 'product:edit'] });
  });

  test('adds new permissions without duplicates', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = {
      validated: {
        params: { id: user._id.toString() },
        body: { permissions: ['product:delete', 'product:create'] }
      }
    };
    const res = createMockRes();

    await addUserPermissionsController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      userId: user._id.toString(),
      permissions: ['product:create', 'product:delete', 'product:edit']
    });
  });

  test('removes permissions', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const req = {
      validated: {
        params: { id: user._id.toString() },
        body: { permissions: ['product:edit'] }
      }
    };
    const res = createMockRes();

    await removeUserPermissionsController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      userId: user._id.toString(),
      permissions: ['product:create', 'product:delete']
    });

    const refreshed = await User.findById(user._id);
    expect(refreshed.permissions).toEqual(['product:create', 'product:delete']);
  });
});

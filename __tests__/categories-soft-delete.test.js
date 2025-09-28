import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  createCategory,
  listCategories,
  getCategory,
  deleteCategory,
  restoreCategory,
  updateCategory
} from '../src/modules/catalog/category.service.js';
import checkPermission from '../src/middleware/checkPermission.js';
import { PERMISSIONS } from '../src/utils/permissions.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

describe('Category soft delete behaviour', () => {
  jest.setTimeout(10000);
  let shouldSkip = false;
  let category;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    category = await createCategory({ name: 'Seasonal', slug: 'seasonal' });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('permission middleware enforces category delete scope', () => {
    const middleware = checkPermission(PERMISSIONS.CATEGORY_DELETE);
    const req = { user: { roles: [], permissions: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    middleware(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('soft delete hides from public listings and restore brings it back', async () => {
    if (skipIfNeeded(shouldSkip)) return;

    const initial = await listCategories({});
    expect(initial.total).toBe(1);
    expect(initial.items[0].deletedAt).toBeNull();

    const del = await deleteCategory(category._id);
    expect(del.success).toBe(true);

    await expect(getCategory(category._id)).rejects.toThrow();

    const afterDelete = await listCategories({});
    expect(afterDelete.total).toBe(0);

    const adminView = await listCategories({ includeDeleted: true });
    expect(adminView.total).toBe(1);
    expect(adminView.items[0].deletedAt).not.toBeNull();
    expect(adminView.items[0].status).toBe('inactive');

    const restored = await restoreCategory(category._id);
    expect(restored.deletedAt).toBeNull();
    expect(restored.isActive).toBe(true);
    expect(restored.status).toBe('active');

    const fetched = await getCategory(category._id);
    expect(fetched.deletedAt).toBeNull();

    const afterRestore = await listCategories({});
    expect(afterRestore.total).toBe(1);
  });

  test('rejects invalid parent assignments', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await expect(updateCategory(category._id, { parent: category._id })).rejects.toThrow('Category cannot be its own parent');
  });

  test('restore non-existent category throws 404', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(restoreCategory(fakeId)).rejects.toThrow('Category not found');
  });
});

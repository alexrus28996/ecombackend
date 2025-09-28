import { jest } from '@jest/globals';
import {
  createCategory,
  listCategories,
  getCategory,
  deleteCategory,
  restoreCategory
} from '../src/modules/catalog/category.service.js';
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
});

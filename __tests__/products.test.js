import { jest } from '@jest/globals';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct } from '../src/modules/catalog/product.service.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

describe('Products service CRUD', () => {
  let cat;
  let prod;
  let shouldSkip = false;
  jest.setTimeout(10000);

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (shouldSkip) return;
    cat = await Category.create({ name: 'Accessories', slug: 'accessories' });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('create, list, get, update, delete product', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    prod = await createProduct({ name: 'Belt', description: 'Leather belt', price: 15.5, currency: 'USD', category: cat._id, isActive: true });
    expect(prod.name).toBe('Belt');
    expect(prod.slug).toBeTruthy();

    const list1 = await listProducts({ q: 'belt', limit: 10, page: 1 });
    expect(list1.total).toBe(1);
    expect(list1.items[0].name).toBe('Belt');

    const fetched = await getProduct(prod._id);
    expect(fetched._id.toString()).toBe(prod._id.toString());
    expect(fetched.category).toBeTruthy();

    const updated = await updateProduct(prod._id, { description: 'Genuine leather belt' });
    expect(updated.description).toBe('Genuine leather belt');

    const del = await deleteProduct(prod._id);
    expect(del.success).toBe(true);

    const list2 = await listProducts({ q: 'belt', limit: 10, page: 1 });
    expect(list2.total).toBe(0);
  });
});


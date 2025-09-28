import { jest } from '@jest/globals';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct } from '../src/modules/catalog/product.service.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ERROR_CODES } from '../src/errors/index.js';
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

  test('enforces SKU uniqueness for active products', async () => {
    if (skipIfNeeded(shouldSkip)) return;

    const first = await createProduct({
      name: 'Hat Alpha',
      price: 25,
      currency: 'USD',
      category: cat._id,
      sku: 'hat-alpha'
    });
    expect(first.sku).toBe('HAT-ALPHA');

    await expect(
      createProduct({
        name: 'Cap Beta',
        price: 18,
        currency: 'USD',
        category: cat._id,
        sku: 'HAT-alpha'
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.SKU_IN_USE });

    const second = await createProduct({
      name: 'Scarf Gamma',
      price: 30,
      currency: 'USD',
      category: cat._id,
      sku: 'SCARF-GAMMA'
    });

    await expect(updateProduct(second._id, { sku: 'hat-alpha' })).rejects.toMatchObject({
      code: ERROR_CODES.SKU_IN_USE
    });

    await deleteProduct(first._id);

    const updated = await updateProduct(second._id, { sku: 'hat-alpha' });
    expect(updated.sku).toBe('HAT-ALPHA');

    await deleteProduct(second._id);
  });
});


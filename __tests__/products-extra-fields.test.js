import { jest } from '@jest/globals';
import {
  createProduct,
  getProduct,
  updateProduct
} from '../src/modules/catalog/product.service.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

describe('Product extended field support', () => {
  jest.setTimeout(10000);
  let shouldSkip = false;
  let category;

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
    if (skipIfNeeded(shouldSkip)) return;
    category = await Category.create({ name: 'Apparel', slug: 'apparel' });
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('create and update product with extended catalog fields', async () => {
    if (skipIfNeeded(shouldSkip)) return;

    const product = await createProduct({
      name: 'Winter Jacket',
      description: 'A warm winter jacket',
      longDescription: 'Engineered for extreme cold with thermal insulation.',
      price: 199.99,
      compareAtPrice: 249.99,
      costPrice: 120,
      currency: 'USD',
      category: category._id,
      vendor: '  Northwind Outfitters  ',
      taxClass: ' standard ',
      weight: 1.8,
      dimensions: { length: 60, width: 40, height: 10 },
      tags: ['winter', ' cold-weather ', 'winter'],
      metaTitle: 'Winter Jacket',
      metaDescription: 'Stay warm with our premium winter jacket.',
      metaKeywords: ['jacket', ' winter ', 'jacket']
    });

    expect(product.vendor).toBe('Northwind Outfitters');
    expect(product.taxClass).toBe('standard');
    expect(product.tags).toEqual(['winter', 'cold-weather']);
    expect(product.metaKeywords).toEqual(['jacket', 'winter']);
    expect(product.weightUnit).toBe('kg');
    expect(product.dimensions.unit).toBe('cm');

    const updated = await updateProduct(product._id, {
      tags: ['insulated', ' insulated ', 'thermal'],
      metaKeywords: ['insulated', 'thermal', 'thermal'],
      weightUnit: 'lb'
    });

    expect(updated.tags).toEqual(['insulated', 'thermal']);
    expect(updated.metaKeywords).toEqual(['insulated', 'thermal']);
    expect(updated.weightUnit).toBe('lb');

    const fetched = await getProduct(product._id);
    expect(fetched.longDescription).toContain('thermal');
    expect(fetched.compareAtPrice).toBe(249.99);
    expect(fetched.costPrice).toBe(120);
    expect(fetched.vendor).toBe('Northwind Outfitters');
    expect(fetched.tags).toEqual(['insulated', 'thermal']);
    expect(fetched.metaKeywords).toEqual(['insulated', 'thermal']);
    expect(fetched.dimensions.length).toBe(60);
    expect(fetched.dimensions.unit).toBe('cm');
    expect(fetched.weightUnit).toBe('lb');
  });
});

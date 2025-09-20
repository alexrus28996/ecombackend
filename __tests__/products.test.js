import mongoose from 'mongoose';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct } from '../src/modules/catalog/product.service.js';
import { Category } from '../src/modules/catalog/category.model.js';

describe('Products service CRUD', () => {
  let cat;
  let prod;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    await mongoose.connection.db.dropDatabase();
    cat = await Category.create({ name: 'Accessories', slug: 'accessories' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('create, list, get, update, delete product', async () => {
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

  test('enforces SKU hygiene for products and variants', async () => {
    await expect(
      createProduct({
        name: 'Gloves',
        price: 12,
        currency: 'USD',
        category: cat._id,
        variants: [
          { sku: 'GLO-1', price: 12 },
          { sku: 'glo-1', price: 12 }
        ]
      })
    ).rejects.toThrow(/variant sku/i);

    const base = {
      price: 30,
      currency: 'USD',
      category: cat._id,
      variants: [{ sku: 'VAR-1', price: 30 }]
    };

    await createProduct({ ...base, name: 'Sneakers', sku: 'SKU-100' });

    await expect(createProduct({ ...base, name: 'Boots', sku: 'SKU-100' })).rejects.toThrow(/duplicate key|E11000/i);
  });
});


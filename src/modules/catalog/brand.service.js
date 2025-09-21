import { Brand } from './brand.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import slugify from 'slugify';

// TODO(brand-module): add analytics + reporting (top brands, revenue share),
// brand-level promotions, and caching layer for homepage widgets.

/**
 * List brands with optional search and pagination helpers.
 */
export async function listBrands({ q, limit = 50, page = 1 } = {}) {
  const filter = {};
  if (q) filter.name = { $regex: q, $options: 'i' };
  const l = Math.max(1, Number(limit) || 50);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    Brand.find(filter).sort({ name: 1 }).skip(skip).limit(l),
    Brand.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.max(1, Math.ceil(total / l)) };
}

/**
 * Create a brand enforcing unique name/slug constraints.
 */
export async function createBrand(data) {
  const payload = preparePayload(data);
  await assertUniqueFields(payload);
  const brand = await Brand.create(payload);
  return brand;
}

/**
 * Retrieve a single brand by identifier.
 */
export async function getBrand(id) {
  return Brand.findById(id);
}

/**
 * Update a brand, ensuring slug/name uniqueness.
 */
export async function updateBrand(id, data) {
  const payload = preparePayload(data);
  await assertUniqueFields(payload, id);
  const brand = await Brand.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!brand) throw errors.notFound(ERROR_CODES.BRAND_NOT_FOUND);
  return brand;
}

/**
 * Delete a brand only when no products reference it.
 */
export async function deleteBrand(id) {
  const brand = await Brand.findById(id);
  if (!brand) throw errors.notFound(ERROR_CODES.BRAND_NOT_FOUND);
  const { Product } = await import('./product.model.js');
  const count = await Product.countDocuments({ brand: id });
  if (count > 0) throw errors.conflict(ERROR_CODES.BRAND_HAS_PRODUCTS);
  await Brand.findByIdAndDelete(id);
  return { success: true };
}

async function assertUniqueFields(payload, ignoreId) {
  const conditions = [];
  if (payload.name) conditions.push({ name: payload.name });
  if (payload.slug) conditions.push({ slug: payload.slug });
  if (conditions.length === 0) return;
  const query = { $or: conditions };
  if (ignoreId) query._id = { $ne: ignoreId };
  const dup = await Brand.findOne(query).lean();
  if (!dup) return;
  if (payload.name && dup.name === payload.name) throw errors.conflict(ERROR_CODES.BRAND_NAME_IN_USE);
  throw errors.conflict(ERROR_CODES.BRAND_SLUG_IN_USE);
}

function preparePayload(data = {}) {
  const payload = { ...data };
  if (payload.name) payload.name = payload.name.trim();
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
  if (payload.slug) {
    payload.slug = slugify(payload.slug, { lower: true, strict: true });
  } else if (payload.slug === '') {
    delete payload.slug;
  }
  if (payload.logo === '') delete payload.logo;
  return payload;
}

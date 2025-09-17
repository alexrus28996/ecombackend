import { Brand } from './brand.model.js';
import slugify from 'slugify';

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
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}

export async function createBrand(data) {
  const payload = { ...data };
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
  const exists = await Brand.findOne({ $or: [{ name: payload.name }, { slug: payload.slug }] });
  if (exists) return exists;
  return Brand.create(payload);
}

export async function getBrand(id) {
  return Brand.findById(id);
}

export async function updateBrand(id, data) {
  const payload = { ...data };
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
  return Brand.findByIdAndUpdate(id, payload, { new: true });
}

export async function deleteBrand(id) {
  const { Product } = await import('./product.model.js');
  const count = await Product.countDocuments({ brand: id });
  if (count > 0) return { success: false, message: 'Brand has products' };
  await Brand.findByIdAndDelete(id);
  return { success: true };
}

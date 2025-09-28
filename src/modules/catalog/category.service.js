import { Category } from './category.model.js';
import { Product } from './product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { paginate } from '../../utils/pagination.js';

/**
 * Create a category.
 */
export async function createCategory(data) {
  if (data.parent) {
    const parent = await Category.findById(data.parent);
    if (!parent) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  }
  const exists = await Category.findOne({
    $or: [{ name: data.name }, { slug: data.slug }],
    deletedAt: null
  });
  if (exists) return exists; // idempotent create by name/slug
  return Category.create(data);
}

/**
 * List categories with pagination.
 */
export async function listCategories({ q, parent, limit = 50, page = 1, includeDeleted = false } = {}) {
  const filter = {};
  if (q) filter.name = { $regex: q, $options: 'i' };
  if (typeof parent !== 'undefined') filter.parent = parent || null;
  if (!includeDeleted) filter.deletedAt = null;
  return paginate(Category, { filter, sort: { sortOrder: 1, name: 1 }, limit, page });
}

/**
 * Get a category by id.
 */
export async function getCategory(id, { includeDeleted = false } = {}) {
  const query = includeDeleted ? { _id: id } : { _id: id, deletedAt: null };
  const cat = await Category.findOne(query);
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  return cat;
}

/**
 * Update a category by id.
 */
export async function updateCategory(id, data) {
  if (Object.prototype.hasOwnProperty.call(data, 'parent')) {
    if (String(id) === String(data.parent)) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category cannot be its own parent' });
    if (data.parent) {
      const parent = await Category.findById(data.parent);
      if (!parent) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
    }
  }
  const cat = await Category.findOneAndUpdate({ _id: id, deletedAt: null }, data, { new: true });
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  return cat;
}

/**
 * Delete a category by id.
 */
export async function deleteCategory(id) {
  const cat = await Category.findById(id);
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  if (cat.deletedAt) return { success: true };

  const childCount = await Category.countDocuments({ parent: id, deletedAt: null });
  if (childCount > 0) throw errors.badRequest(ERROR_CODES.CATEGORY_HAS_CHILDREN);
  const prodCount = await Product.countDocuments({ category: id });
  if (prodCount > 0) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category has products' });
  cat.deletedAt = new Date();
  cat.isActive = false;
  cat.status = 'inactive';
  await cat.save();
  return { success: true };
}

/**
 * Restore a previously soft-deleted category.
 */
export async function restoreCategory(id) {
  const cat = await Category.findById(id);
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  cat.deletedAt = null;
  cat.isActive = true;
  cat.status = 'active';
  await cat.save();
  return cat;
}

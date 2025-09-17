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
  const exists = await Category.findOne({ $or: [{ name: data.name }, { slug: data.slug }] });
  if (exists) return exists; // idempotent create by name/slug
  return Category.create(data);
}

/**
 * List categories with pagination.
 */
export async function listCategories({ q, parent, limit = 50, page = 1 } = {}) {
  const filter = {};
  if (q) filter.name = { $regex: q, $options: 'i' };
  if (typeof parent !== 'undefined') filter.parent = parent || null;
  return paginate(Category, { filter, sort: { sortOrder: 1, name: 1 }, limit, page });
}

/**
 * Get a category by id.
 */
export async function getCategory(id) {
  const cat = await Category.findById(id);
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
  const cat = await Category.findByIdAndUpdate(id, data, { new: true });
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  return cat;
}

/**
 * Delete a category by id.
 */
export async function deleteCategory(id) {
  const childCount = await Category.countDocuments({ parent: id });
  if (childCount > 0) throw errors.badRequest(ERROR_CODES.CATEGORY_HAS_CHILDREN);
  const prodCount = await Product.countDocuments({ category: id });
  if (prodCount > 0) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category has products' });
  const cat = await Category.findByIdAndDelete(id);
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  return { success: true };
}

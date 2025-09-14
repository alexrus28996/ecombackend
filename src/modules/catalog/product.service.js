import { Product } from './product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { paginate } from '../../utils/pagination.js';

/**
 * Return a paginated list of products with basic text search.
 * @param {{ q?: string, limit?: number, page?: number }} params
 */
export async function listProducts({ q, category, limit = config.API_DEFAULT_PAGE_SIZE, page = 1 }) {
  const filter = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }
  if (category) filter.category = category;
  return paginate(Product, { filter, limit, page });
}

/**
 * Get a single product by id or throw NOT_FOUND.
 */
export async function getProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  return product;
}

/**
 * Create a new product.
 */
export async function createProduct(data) {
  const product = await Product.create(data);
  return product;
}

/**
 * Update a product by id or throw NOT_FOUND.
 */
export async function updateProduct(id, data) {
  const product = await Product.findByIdAndUpdate(id, data, { new: true });
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  return product;
}

/**
 * Delete a product by id or throw NOT_FOUND.
 */
export async function deleteProduct(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  return { success: true };
}

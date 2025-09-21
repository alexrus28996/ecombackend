import { Product } from './product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { paginate } from '../../utils/pagination.js';
import { listAttributesWithOptions } from './attribute.service.js';
import { listVariants, attributeMapFromVariant } from './variant.service.js';

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
  return paginate(Product, { filter, limit, page, populate: [ { path: 'category', select: 'name slug' }, { path: 'brand', select: 'name slug' } ] });
}

/**
 * Get a single product by id or throw NOT_FOUND.
 */
export async function getProduct(id) {
  const productDoc = await Product.findById(id).populate('category', 'name slug').populate('brand', 'name slug');
  if (!productDoc) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  const [attributeConfig, variantDocs] = await Promise.all([
    listAttributesWithOptions(id),
    listVariants(id)
  ]);
  const product = productDoc.toObject({ virtuals: true });
  const variants = variantDocs.map((variant) => ({
    ...variant,
    attributeMap: attributeMapFromVariant(variant)
  }));
  product.attributeConfig = attributeConfig;
  product.variants = variants;
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
  const product = await Product.findById(id);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  // Prevent delete if referenced by inventory/reviews/orders/shipments
  const [{ StockItem }] = await Promise.all([import('../inventory/models/stock-item.model.js')]);
  const invCount = await StockItem.countDocuments({ productId: id });
  if (invCount > 0) throw errors.conflict(ERROR_CODES.PRODUCT_HAS_INVENTORY);
  const { Review } = await import('../reviews/review.model.js');
  const revCount = await Review.countDocuments({ product: id });
  if (revCount > 0) throw errors.conflict(ERROR_CODES.PRODUCT_HAS_REVIEWS);
  const { Order } = await import('../orders/order.model.js');
  const ordCount = await Order.countDocuments({ 'items.product': id });
  if (ordCount > 0) throw errors.conflict(ERROR_CODES.PRODUCT_IN_ORDERS);
  const { Shipment } = await import('../orders/shipment.model.js');
  const shpCount = await Shipment.countDocuments({ 'items.product': id });
  if (shpCount > 0) throw errors.conflict(ERROR_CODES.PRODUCT_IN_SHIPMENTS);
  await Product.deleteOne({ _id: id });
  return { success: true };
}

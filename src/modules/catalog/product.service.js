import { Product } from './product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { paginate } from '../../utils/pagination.js';
import { listAttributesWithOptions } from './attribute.service.js';
import { listVariants, attributeMapFromVariant } from './variant.service.js';

function normalizeOptionalStringArray(values) {
  if (typeof values === 'undefined') return undefined;
  if (!Array.isArray(values)) return [];
  const sanitized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set(sanitized));
}

function sanitizeProductData(data, { isUpdate = false } = {}) {
  const sanitized = { ...data };

  if (Object.prototype.hasOwnProperty.call(sanitized, 'vendor') && typeof sanitized.vendor === 'string') {
    const trimmed = sanitized.vendor.trim();
    if (trimmed === '') {
      if (isUpdate) delete sanitized.vendor;
      else sanitized.vendor = undefined;
    } else {
      sanitized.vendor = trimmed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, 'taxClass') && typeof sanitized.taxClass === 'string') {
    const trimmed = sanitized.taxClass.trim();
    if (trimmed === '') {
      if (isUpdate) delete sanitized.taxClass;
      else sanitized.taxClass = undefined;
    } else {
      sanitized.taxClass = trimmed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, 'tags')) {
    const tags = normalizeOptionalStringArray(sanitized.tags);
    if (typeof tags !== 'undefined') sanitized.tags = tags;
    else delete sanitized.tags;
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, 'metaKeywords')) {
    const keywords = normalizeOptionalStringArray(sanitized.metaKeywords);
    if (typeof keywords !== 'undefined') sanitized.metaKeywords = keywords;
    else delete sanitized.metaKeywords;
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, 'sku')) {
    if (sanitized.sku === null) {
      sanitized.sku = null;
    } else if (typeof sanitized.sku === 'string') {
      const trimmed = sanitized.sku.trim();
      sanitized.sku = trimmed === '' ? null : trimmed.toUpperCase();
    } else if (typeof sanitized.sku === 'undefined') {
      delete sanitized.sku;
    } else {
      const coerced = String(sanitized.sku).trim();
      sanitized.sku = coerced === '' ? null : coerced.toUpperCase();
    }
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, 'dimensions') && sanitized.dimensions) {
    const dimensions = { ...sanitized.dimensions };
    const hasSizeValues = ['length', 'width', 'height'].some((key) =>
      Object.prototype.hasOwnProperty.call(dimensions, key)
    );
    const hasUnit = Object.prototype.hasOwnProperty.call(dimensions, 'unit');
    if (!hasSizeValues && !hasUnit) {
      delete sanitized.dimensions;
    } else {
      if (!hasUnit) dimensions.unit = 'cm';
      sanitized.dimensions = dimensions;
    }
  }

  if (!isUpdate && !Object.prototype.hasOwnProperty.call(sanitized, 'weightUnit')) {
    sanitized.weightUnit = 'kg';
  }

  if (isUpdate && sanitized.weightUnit === '') {
    delete sanitized.weightUnit;
  }

  return sanitized;
}

async function assertSkuAvailable(sku, ignoreId) {
  if (typeof sku !== 'string' || sku.length === 0) return;
  const query = { sku, deletedAt: null };
  if (ignoreId) query._id = { $ne: ignoreId };
  const existing = await Product.findOne(query).lean();
  if (existing) throw errors.conflict(ERROR_CODES.SKU_IN_USE);
}

/**
 * Return a paginated list of products with basic text search.
 * @param {{ q?: string, limit?: number, page?: number }} params
 */
export async function listProducts({ q, category, limit = config.API_DEFAULT_PAGE_SIZE, page = 1 }) {
  const filter = { deletedAt: null };
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
  const productDoc = await Product.findOne({ _id: id, deletedAt: null })
    .populate('category', 'name slug')
    .populate('brand', 'name slug');
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
  const payload = sanitizeProductData(data);
  await assertSkuAvailable(payload.sku);
  const product = await Product.create(payload);
  return product.toObject();
}

/**
 * Update a product by id or throw NOT_FOUND.
 */
export async function updateProduct(id, data) {
  const payload = sanitizeProductData(data, { isUpdate: true });
  await assertSkuAvailable(payload.sku, id);
  const product = await Product.findOneAndUpdate(
    { _id: id, deletedAt: null },
    payload,
    { new: true }
  );
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  return product.toObject();
}

/**
 * Delete a product by id or throw NOT_FOUND.
 */
export async function deleteProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  if (product.deletedAt) return { success: true };
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
  product.deletedAt = new Date();
  product.isActive = false;
  await product.save();
  return { success: true };
}

export async function restoreProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  product.deletedAt = null;
  if (typeof product.isActive === 'boolean') product.isActive = true;
  await product.save();
  return product.toObject();
}

import { InventoryAdjustment } from './adjustment.model.js';
import { Inventory } from './inventory.model.js';
import { Product } from '../catalog/product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

/**
 * Adjust stock for a product or specific variant.
 * qtyChange: positive to add, negative to subtract. Prevents negative stock.
 */
export async function adjustStock({ productId, variantId, qtyChange, reason = 'manual', note, byUserId, location = null }) {
  const product = await Product.findById(productId);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);

  // Find inventory record or initialize from product/variant stock
  let inv = await Inventory.findOne({ product: productId, variant: variantId || null, location });
  if (!inv) {
    let initial = 0;
    if (variantId) {
      const variant = product.variants?.find(v => v._id.toString() === String(variantId));
      if (!variant) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
      initial = Number(variant.stock || 0);
      inv = await Inventory.create({ product: productId, variant: variantId, sku: variant.sku, qty: initial, location });
    } else {
      initial = Number(product.stock || 0);
      inv = await Inventory.create({ product: productId, qty: initial, location });
    }
  }

  const previousStock = Number(inv.qty || 0);
  const newStock = previousStock + Number(qtyChange || 0);
  if (newStock < 0) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);
  inv.qty = newStock;
  await inv.save();

  const adj = await InventoryAdjustment.create({
    product: product._id,
    variant: variantId || undefined,
    qtyChange,
    reason,
    note,
    previousStock,
    newStock,
    user: byUserId
  });
  return { product, inventory: inv, adjustment: adj };
}

export async function listAdjustments({ product, variant, reason, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (product) filter.product = product;
  if (variant) filter.variant = variant;
  if (reason) filter.reason = reason;
  const l = Math.max(1, Number(limit) || 20);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    InventoryAdjustment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    InventoryAdjustment.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}

/**
 * Get current stock for product/variant using Inventory model if present; fallback to product fields.
 */
export async function getAvailableStock(productId, variantId) {
  const inv = await Inventory.findOne({ product: productId, variant: variantId || null, location: null });
  if (inv) return Number(inv.qty || 0);
  const product = await Product.findById(productId).lean();
  if (!product) return 0;
  if (variantId) {
    const variant = (product.variants || []).find(v => String(v._id) === String(variantId));
    return Number(variant?.stock || 0);
  }
  return Number(product.stock || 0);
}

export async function listInventory({ product, variant, location, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (product) filter.product = product;
  if (variant) filter.variant = variant;
  if (typeof location !== 'undefined') filter.location = location;
  const l = Math.max(1, Number(limit) || 20);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    Inventory.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(l),
    Inventory.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}


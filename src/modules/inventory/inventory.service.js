import { InventoryAdjustment } from './adjustment.model.js';
import { Inventory } from './inventory.model.js';
import { Product } from '../catalog/product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { ProductVariant } from '../catalog/product-variant.model.js';

/**
 * Adjust stock for a product or specific variant.
 * qtyChange: positive to add, negative to subtract. Prevents negative stock.
 */
export async function adjustStock({ productId, variantId, qtyChange, reason = 'manual', note, byUserId, location = null, session = null }) {
  const product = session ? await Product.findById(productId).session(session) : await Product.findById(productId);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);

  // Find inventory record or initialize from product/variant stock
  let invQuery = Inventory.findOne({ product: productId, variant: variantId || null, location });
  if (session) invQuery = invQuery.session(session);
  let inv = await invQuery;
  if (!inv) {
    // Treat Inventory as the single source of truth; initialize new records with qty: 0
    if (variantId) {
      const variant = await ProductVariant.findOne({ _id: variantId, product: productId }).lean();
      if (!variant) throw errors.notFound(ERROR_CODES.VARIANT_NOT_FOUND);
      inv = await Inventory.create([
        { product: productId, variant: variantId, sku: variant.sku, qty: 0, location }
      ], { session });
      inv = inv[0];
    } else {
      inv = await Inventory.create([
        { product: productId, qty: 0, location }
      ], { session });
      inv = inv[0];
    }
  }

  const previousStock = Number(inv.qty || 0);
  const newStock = previousStock + Number(qtyChange || 0);
  if (newStock < 0) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);
  inv.qty = newStock;
  await inv.save({ session: session || undefined });

  const adjDocs = await InventoryAdjustment.create([{
    product: product._id,
    variant: variantId || undefined,
    qtyChange,
    reason,
    note,
    previousStock,
    newStock,
    user: byUserId
  }], { session: session || undefined });
  return { product, inventory: inv, adjustment: adjDocs[0] };
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
 * Get current stock for product/variant using Inventory model only.
 * If no inventory record exists, treats available stock as 0.
 */
export async function getAvailableStock(productId, variantId) {
  const inv = await Inventory.findOne({ product: productId, variant: variantId || null, location: null });
  if (inv) return Number(inv.qty || 0);
  // Inventory is the source of truth; if no record, treat as zero
  return 0;
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

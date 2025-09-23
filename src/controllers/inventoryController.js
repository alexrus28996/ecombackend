import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { HttpError, normalizeError } from '../utils/errorHandler.js';

function ensureValidObjectId(value, field) {
  if (!mongoose.isValidObjectId(value)) {
    throw new HttpError(400, `Invalid ${field}`);
  }
}

function ensureNonNegativeNumber(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new HttpError(400, `${field} must be a number`);
  }
  if (num < 0) {
    throw new HttpError(400, `${field} cannot be negative`);
  }
  return Math.trunc(num);
}

function findVariant(product, variantId) {
  const variant = product.variants?.id?.(variantId);
  if (!variant) {
    throw new HttpError(400, 'Variant not found for this product');
  }
  return variant;
}

function recalcProductStock(product) {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    product.stock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
  }
}

function toPlainProduct(product) {
  const doc = product.toObject({ versionKey: false });
  doc.id = doc._id?.toString();
  if (Array.isArray(doc.variants)) {
    doc.variants = doc.variants.map((variant) => ({
      id: variant._id?.toString(),
      combination: variant.combination instanceof Map ? Object.fromEntries(variant.combination) : variant.combination,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      status: variant.status
    }));
  }
  delete doc._id;
  return doc;
}

async function applyInventoryUpdate({ productId, stock, variantId, variants, price, status }) {
  ensureValidObjectId(productId, 'productId');
  const product = await Product.findById(productId);
  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (!variantId && stock !== undefined && !hasVariants) {
    product.stock = ensureNonNegativeNumber(stock, 'stock');
  }

  const updateVariant = (variant, update) => {
    if (update.stock !== undefined) {
      variant.stock = ensureNonNegativeNumber(update.stock, 'stock');
      if (variant.stock === 0) {
        variant.status = 'inactive';
      } else if (!update.status) {
        variant.status = 'active';
      }
    }
    if (update.price !== undefined) {
      const newPrice = Number(update.price);
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        throw new HttpError(400, 'Variant price must be greater than 0');
      }
      variant.price = newPrice;
    }
    if (update.status !== undefined) {
      if (!['active', 'inactive'].includes(update.status)) {
        throw new HttpError(400, 'Variant status must be active or inactive');
      }
      variant.status = update.status;
    }
    if (variant.stock === 0) {
      variant.status = 'inactive';
    }
  };

  if (variantId !== undefined) {
    ensureValidObjectId(variantId, 'variantId');
    const variant = findVariant(product, variantId);
    updateVariant(variant, { stock, price, status });
  }

  if (Array.isArray(variants)) {
    for (const update of variants) {
      if (!update || typeof update !== 'object') {
        throw new HttpError(400, 'Variant update payload is invalid');
      }
      if (!update.variantId) {
        throw new HttpError(400, 'variantId is required for variant updates');
      }
      ensureValidObjectId(update.variantId, 'variantId');
      const variant = findVariant(product, update.variantId);
      updateVariant(variant, update);
    }
  }

  if (hasVariants || product.variants?.length) {
    recalcProductStock(product);
  }
  await product.save();
  return product;
}

export async function updateInventory(req, res, next) {
  try {
    const { id } = req.params;
    ensureValidObjectId(id, 'product id');
    const product = await applyInventoryUpdate({
      productId: id,
      stock: req.body.stock,
      variantId: req.body.variantId,
      variants: req.body.variants,
      price: req.body.price,
      status: req.body.status
    });
    res.json({ data: toPlainProduct(product) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function bulkUpdateInventory(req, res, next) {
  try {
    const { updates } = req.body || {};
    if (!Array.isArray(updates) || !updates.length) {
      throw new HttpError(400, 'updates array is required');
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const product = await applyInventoryUpdate(update);
        results.push({ productId: product._id.toString(), stock: product.stock });
      } catch (err) {
        const normalized = normalizeError(err);
        errors.push({ productId: update?.productId, message: normalized.message });
      }
    }

    res.json({ results, errors });
  } catch (error) {
    next(normalizeError(error));
  }
}

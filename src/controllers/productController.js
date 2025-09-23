import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { HttpError, normalizeError } from '../utils/errorHandler.js';

/**
 * Helper: ensure we work with positive numbers.
 */
function parsePrice(value, field = 'price') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new HttpError(400, `${field} must be greater than 0`);
  }
  return num;
}

function parseStock(value, field = 'stock') {
  if (value === undefined || value === null) return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new HttpError(400, `${field} cannot be negative`);
  }
  return Math.trunc(num);
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => String(img || '').trim())
    .filter(Boolean);
}

function sanitizeAttributes(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const cleaned = {};
  for (const [key, values] of Object.entries(raw)) {
    if (!Array.isArray(values)) continue;
    const sanitizedValues = Array.from(
      new Set(
        values
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    );
    if (sanitizedValues.length) cleaned[key] = sanitizedValues;
  }
  return cleaned;
}

function slugifyVariantPart(part) {
  return String(part || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function mapToPlainObject(map) {
  return Array.from(map.entries()).reduce((acc, [k, v]) => {
    acc[k] = v;
    return acc;
  }, {});
}

function generateVariantsFromAttributes(baseSku, attributes, basePrice, defaultStock) {
  const attrEntries = Object.entries(attributes).filter(([, values]) => Array.isArray(values) && values.length);
  if (!attrEntries.length) return [];

  const combinations = [];
  const traverse = (index, acc) => {
    if (index === attrEntries.length) {
      combinations.push(new Map(acc));
      return;
    }
    const [key, values] = attrEntries[index];
    for (const value of values) {
      acc.set(key, value);
      traverse(index + 1, acc);
      acc.delete(key);
    }
  };
  traverse(0, new Map());

  return combinations.map((combo) => {
    const skuParts = [baseSku, ...Array.from(combo.values()).map(slugifyVariantPart)];
    const variantStock = parseStock(defaultStock, 'variant stock');
    const stock = variantStock;
    return {
      combination: mapToPlainObject(combo),
      sku: skuParts.filter(Boolean).join('-'),
      price: basePrice,
      stock,
      status: stock > 0 ? 'active' : 'inactive'
    };
  });
}

function sanitizeVariants(rawVariants, attributes, baseSku) {
  if (!Array.isArray(rawVariants)) return [];
  return rawVariants.map((variant, index) => {
    if (!variant || typeof variant !== 'object') {
      throw new HttpError(400, `Variant at index ${index} is invalid`);
    }
    const combination = new Map();
    if (variant.combination && typeof variant.combination === 'object') {
      for (const [key, value] of Object.entries(variant.combination)) {
        const attrValues = attributes[key];
        if (attrValues && !attrValues.includes(String(value))) {
          throw new HttpError(400, `Invalid value '${value}' for attribute '${key}'`);
        }
        combination.set(key, String(value));
      }
    } else {
      throw new HttpError(400, 'Variant combination is required');
    }

    const sku = String(variant.sku || '').trim().toUpperCase();
    if (!sku) throw new HttpError(400, 'Variant SKU is required');
    const price = parsePrice(variant.price, 'variant price');
    const stock = parseStock(variant.stock, 'variant stock');
    const status = stock === 0 ? 'inactive' : variant.status || 'active';
    if (!['active', 'inactive'].includes(status)) {
      throw new HttpError(400, 'Variant status must be active or inactive');
    }

    return {
      combination: mapToPlainObject(combination),
      sku,
      price,
      stock,
      status: stock === 0 ? 'inactive' : status
    };
  });
}

function formatProductResponse(product) {
  const doc = product.toObject({ versionKey: false });
  return {
    id: doc._id.toString(),
    name: doc.name,
    sku: doc.sku,
    price: doc.price,
    category: doc.category,
    images: doc.images,
    stock: doc.stock,
    attributes: doc.attributes || {},
    variants: (doc.variants || []).map((variant) => ({
      id: variant._id?.toString(),
      combination: variant.combination instanceof Map ? mapToPlainObject(variant.combination) : variant.combination,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      status: variant.status
    })),
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

function ensureProductExists(product) {
  if (!product) {
    throw new HttpError(404, 'Product not found');
  }
}

function recomputeAggregateStock(product) {
  if (!Array.isArray(product.variants) || product.variants.length === 0) return;
  product.stock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
}

export async function createProduct(req, res, next) {
  try {
    const { name, sku, price, category, images, attributes, variants, stock, status } = req.body;

    if (!name || typeof name !== 'string') throw new HttpError(400, 'Product name is required');
    const skuValue = String(sku || '').trim();
    if (!skuValue) throw new HttpError(400, 'SKU is required');
    const priceValue = parsePrice(price);
    if (!mongoose.isValidObjectId(category)) {
      throw new HttpError(400, 'Invalid category id');
    }

    const productAttributes = sanitizeAttributes(attributes);

    let productVariants = sanitizeVariants(variants, productAttributes, skuValue.toUpperCase());
    if (!productVariants.length && Object.keys(productAttributes).length) {
      productVariants = generateVariantsFromAttributes(skuValue.toUpperCase(), productAttributes, priceValue, stock);
    }

    const productData = {
      name: name.trim(),
      sku: skuValue.toUpperCase(),
      price: priceValue,
      category,
      images: sanitizeImages(images),
      stock: parseStock(productVariants.length ? productVariants.reduce((sum, v) => sum + v.stock, 0) : stock),
      attributes: productAttributes,
      variants: productVariants,
      status: status === 'inactive' ? 'inactive' : 'active'
    };

    const product = await Product.create(productData);
    res.status(201).json({ data: formatProductResponse(product) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid product id');

    const product = await Product.findById(id);
    ensureProductExists(product);

    const { name, price, category, images, attributes, variants, stock, status } = req.body;

    if (name !== undefined) {
      if (!name || typeof name !== 'string') throw new HttpError(400, 'Name must be a non-empty string');
      product.name = name.trim();
    }
    if (price !== undefined) {
      product.price = parsePrice(price);
    }
    if (category !== undefined) {
      if (!mongoose.isValidObjectId(category)) throw new HttpError(400, 'Invalid category id');
      product.category = category;
    }
    if (images !== undefined) {
      product.images = sanitizeImages(images);
    }
    let productAttributes = product.attributes || {};
    let variantsUpdated = false;
    if (attributes !== undefined) {
      productAttributes = sanitizeAttributes(attributes);
      product.attributes = productAttributes;
      variantsUpdated = true;
    }

    if (variants !== undefined) {
      product.variants = sanitizeVariants(variants, productAttributes, product.sku);
      variantsUpdated = true;
    }

    if (variantsUpdated) {
      if (!product.variants?.length && Object.keys(productAttributes).length) {
        product.variants = generateVariantsFromAttributes(product.sku, productAttributes, product.price, stock ?? product.stock);
      }
      recomputeAggregateStock(product);
    }

    if (!product.variants?.length && stock !== undefined) {
      product.stock = parseStock(stock);
    } else if (product.variants?.length) {
      recomputeAggregateStock(product);
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) throw new HttpError(400, 'Status must be active or inactive');
      product.status = status;
    }

    await product.save();
    res.json({ data: formatProductResponse(product) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid product id');

    const product = await Product.findByIdAndDelete(id);
    ensureProductExists(product);
    res.status(204).send();
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function listProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, status, category, minPrice, maxPrice } = req.query;
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const filter = {};

    if (status) {
      if (!['active', 'inactive'].includes(status)) throw new HttpError(400, 'Invalid status filter');
      filter.status = status;
    }
    if (category) {
      if (!mongoose.isValidObjectId(category)) throw new HttpError(400, 'Invalid category filter');
      filter.category = category;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = parsePrice(minPrice, 'minPrice');
      if (maxPrice !== undefined) filter.price.$lte = parsePrice(maxPrice, 'maxPrice');
      if (filter.price.$gte !== undefined && filter.price.$lte !== undefined && filter.price.$gte > filter.price.$lte) {
        throw new HttpError(400, 'minPrice cannot be greater than maxPrice');
      }
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter)
    ]);

    res.json({
      data: items.map(formatProductResponse),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 0,
        limit: limitNum
      }
    });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid product id');

    const product = await Product.findById(id);
    ensureProductExists(product);
    res.json({ data: formatProductResponse(product) });
  } catch (error) {
    next(normalizeError(error));
  }
}

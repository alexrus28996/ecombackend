import slugify from 'slugify';
import { Product } from './product.model.js';
import { ProductAttribute } from './product-attribute.model.js';
import { ProductOption } from './product-option.model.js';
import { ProductVariant } from './product-variant.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-_.]*$/i;

function normalizeSelections(selections = []) {
  return selections
    .map(sel => ({ attribute: String(sel.attribute), option: String(sel.option) }))
    .sort((a, b) => a.attribute.localeCompare(b.attribute));
}

function buildCombinationKey(selections = []) {
  const normalized = normalizeSelections(selections);
  return normalized.map(sel => `${sel.attribute}:${sel.option}`).join('|');
}

function computeSku(baseSku, suffixParts) {
  const normalizedSuffix = suffixParts.map((part) => slugify(String(part), { lower: true, strict: true }).toUpperCase());
  if (!baseSku) return normalizedSuffix.join('-');
  return `${baseSku}-${normalizedSuffix.join('-')}`;
}

function applyVariantDefaults(variant, defaults = {}) {
  if (typeof defaults.priceOverride === 'number' && !('priceOverride' in variant)) variant.priceOverride = defaults.priceOverride;
  if (typeof defaults.priceDelta === 'number' && !('priceDelta' in variant)) variant.priceDelta = defaults.priceDelta;
  if (typeof defaults.stock === 'number' && !('stock' in variant)) variant.stock = defaults.stock;
  return variant;
}

async function resolveSelections(productId, selections = []) {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw errors.badRequest(ERROR_CODES.VARIANT_COMBINATION_INVALID);
  }
  const attributeIds = selections.map(sel => sel.attribute);
  const optionIds = selections.map(sel => sel.option);
  const attributes = await ProductAttribute.find({ _id: { $in: attributeIds }, product: productId }).lean();
  if (attributes.length !== attributeIds.length) throw errors.badRequest(ERROR_CODES.VARIANT_COMBINATION_INVALID);
  const options = await ProductOption.find({ _id: { $in: optionIds }, product: productId }).lean();
  if (options.length !== optionIds.length) throw errors.badRequest(ERROR_CODES.VARIANT_COMBINATION_INVALID);
  const attrMap = attributes.reduce((acc, attr) => { acc[String(attr._id)] = attr; return acc; }, {});
  const optionMap = options.reduce((acc, opt) => { acc[String(opt._id)] = opt; return acc; }, {});
  selections.forEach(sel => {
    const option = optionMap[String(sel.option)];
    if (!option || String(option.attribute) !== String(sel.attribute)) {
      throw errors.badRequest(ERROR_CODES.VARIANT_COMBINATION_INVALID);
    }
  });
  return normalizeSelections(selections).map(sel => ({
    attribute: sel.attribute,
    option: sel.option,
    attributeDoc: attrMap[sel.attribute],
    optionDoc: optionMap[sel.option]
  }));
}

/**
 * Retrieve variants for a product with attribute/option hydration.
 */
export async function listVariants(productId) {
  const variants = await ProductVariant.find({ product: productId }).sort({ createdAt: 1 })
    .populate('selections.attribute', 'name slug')
    .populate('selections.option', 'name slug')
    .lean();
  return variants;
}

/**
 * Create an explicit variant, validating SKU and combination uniqueness.
 */
export async function createVariant(productId, payload) {
  const product = await Product.findById(productId).lean();
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  const selections = await resolveSelections(productId, payload.selections);
  const combinationKey = buildCombinationKey(selections);
  await assertCombinationAvailable(productId, combinationKey);
  const sku = normalizeSku(payload.sku);
  await assertSkuAvailable(productId, sku);
  const variant = await ProductVariant.create({
    product: productId,
    sku,
    combinationKey,
    selections: selections.map(sel => ({ attribute: sel.attribute, option: sel.option })),
    priceOverride: payload.priceOverride,
    priceDelta: payload.priceDelta,
    stock: payload.stock ?? 0,
    barcode: payload.barcode,
    isActive: payload.isActive !== false
  });
  return variant;
}

/**
 * Update an existing variant.
 */
export async function updateVariant(variantId, payload) {
  const variant = await ProductVariant.findById(variantId);
  if (!variant) throw errors.notFound(ERROR_CODES.VARIANT_NOT_FOUND);
  if (payload.selections) {
    const selections = await resolveSelections(variant.product, payload.selections);
    const combinationKey = buildCombinationKey(selections);
    if (combinationKey !== variant.combinationKey) {
      await assertCombinationAvailable(variant.product, combinationKey, variantId);
      variant.combinationKey = combinationKey;
    }
    variant.selections = selections.map(sel => ({ attribute: sel.attribute, option: sel.option }));
  }
  if (payload.sku) {
    const sku = normalizeSku(payload.sku);
    if (sku !== variant.sku) {
      await assertSkuAvailable(variant.product, sku, variantId);
      variant.sku = sku;
    }
  }
  if (typeof payload.priceOverride !== 'undefined') variant.priceOverride = payload.priceOverride;
  if (typeof payload.priceDelta !== 'undefined') variant.priceDelta = payload.priceDelta;
  if (typeof payload.stock !== 'undefined') variant.stock = payload.stock;
  if (typeof payload.barcode !== 'undefined') variant.barcode = payload.barcode;
  if (typeof payload.isActive !== 'undefined') variant.isActive = payload.isActive;
  await variant.save();
  return variant;
}

/**
 * Remove variant by id.
 */
export async function deleteVariant(variantId) {
  const variant = await ProductVariant.findById(variantId);
  if (!variant) throw errors.notFound(ERROR_CODES.VARIANT_NOT_FOUND);
  await ProductVariant.deleteOne({ _id: variantId });
  return { success: true };
}

/**
 * Generate variants for all attribute/option combinations for a product.
 * Adds missing variants and returns the complete list. Existing variants remain untouched.
 * TODO(variants):
 *  - Support variant-level image galleries for richer merchandising.
 *  - Add bulk update tooling to sync pricing/stock across combinations.
 *  - Explore caching precomputed combination lookups for large catalogs.
 */
export async function generateVariantMatrix(productId, { skuPrefix, defaults } = {}) {
  const product = await Product.findById(productId).lean();
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  const attributes = await ProductAttribute.find({ product: productId }).sort({ sortOrder: 1, name: 1 }).lean();
  if (!attributes.length) return [];
  const attributeIds = attributes.map(attr => attr._id);
  const options = await ProductOption.find({ product: productId, attribute: { $in: attributeIds } }).sort({ sortOrder: 1, name: 1 }).lean();
  const attributeOptionPairs = attributes
    .map(attr => ({
      attribute: attr,
      options: options.filter(opt => String(opt.attribute) === String(attr._id))
    }))
    .filter(pair => pair.options.length > 0);
  if (!attributeOptionPairs.length) return [];
  const cartesian = attributeOptionPairs.reduce(
    (acc, pair) => acc.flatMap(x => pair.options.map(opt => [...x, { attribute: pair.attribute, option: opt }])),
    [[]]
  );
  const existingVariants = await ProductVariant.find({ product: productId }).lean();
  const existingByKey = new Map(existingVariants.map(v => [v.combinationKey, v]));
  const toInsert = [];
  for (const combo of cartesian) {
    const selectionPairs = combo.map(item => ({ attribute: item.attribute._id, option: item.option._id }));
    const normalized = normalizeSelections(selectionPairs);
    const combinationKey = buildCombinationKey(normalized);
    if (existingByKey.has(combinationKey)) continue;
    const suffixParts = normalized.map(sel => {
      const option = options.find(opt => String(opt._id) === String(sel.option));
      return option?.slug || option?.name || sel.option;
    });
    const sku = normalizeSku(computeSku(skuPrefix || product.sku || product.slug || product._id.toString(), suffixParts));
    toInsert.push(applyVariantDefaults({
      product: productId,
      sku,
      combinationKey,
      selections: normalized.map(sel => ({ attribute: sel.attribute, option: sel.option })),
      stock: 0,
      isActive: true
    }, defaults));
  }
  if (toInsert.length) {
    await ProductVariant.insertMany(toInsert);
  }
  return listVariants(productId);
}

export async function getVariantWithDetails(variantId) {
  const variant = await ProductVariant.findById(variantId)
    .populate('selections.attribute', 'name slug')
    .populate('selections.option', 'name slug')
    .lean();
  if (!variant) throw errors.notFound(ERROR_CODES.VARIANT_NOT_FOUND);
  return variant;
}

export function attributeMapFromVariant(variant) {
  const selections = variant?.selections || [];
  const attributeMap = {};
  selections.forEach((sel) => {
    const attrName = sel.attribute?.name;
    const optionName = sel.option?.name;
    if (attrName && optionName) attributeMap[attrName] = optionName;
  });
  return attributeMap;
}

async function assertCombinationAvailable(productId, combinationKey, ignoreId) {
  const query = { product: productId, combinationKey };
  if (ignoreId) query._id = { $ne: ignoreId };
  const existing = await ProductVariant.findOne(query).lean();
  if (existing) throw errors.conflict(ERROR_CODES.VARIANT_COMBINATION_IN_USE);
}

function normalizeSku(sku) {
  if (!sku) throw errors.badRequest(ERROR_CODES.INVALID_SKU);
  const trimmed = sku.trim();
  if (!SKU_PATTERN.test(trimmed)) throw errors.badRequest(ERROR_CODES.INVALID_SKU);
  return trimmed.toUpperCase();
}

async function assertSkuAvailable(productId, sku, ignoreId) {
  const query = { product: productId, sku };
  if (ignoreId) query._id = { $ne: ignoreId };
  const existing = await ProductVariant.findOne(query).lean();
  if (existing) throw errors.conflict(ERROR_CODES.SKU_IN_USE);
}

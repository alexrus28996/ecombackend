import { Product } from '../../../modules/catalog/product.model.js';
import { ProductVariant } from '../../../modules/catalog/product-variant.model.js';
import {
  listVariants,
  createVariant,
  updateVariant,
  deleteVariant,
  generateVariantMatrix,
  getVariantWithDetails,
  attributeMapFromVariant
} from '../../../modules/catalog/variant.service.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';

function decorateVariant(variant) {
  const plain = typeof variant.toObject === 'function' ? variant.toObject() : { ...variant };
  return { ...plain, attributeMap: attributeMapFromVariant(plain) };
}

async function ensureProduct(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  return product;
}

async function ensureVariant(variantId, productId) {
  const variant = await ProductVariant.findById(variantId).lean();
  if (!variant || (productId && String(variant.product) !== String(productId))) {
    throw errors.notFound(ERROR_CODES.VARIANT_NOT_FOUND);
  }
  return variant;
}

/**
 * List variants for product.
 */
export async function listProductVariants(req, res) {
  await ensureProduct(req.params.productId);
  const variants = await listVariants(req.params.productId);
  res.json({ items: variants.map(decorateVariant) });
}

/**
 * Create variant.
 */
export async function createProductVariant(req, res) {
  await ensureProduct(req.params.productId);
  const variant = await createVariant(req.params.productId, req.validated.body);
  const hydrated = await getVariantWithDetails(variant._id);
  res.status(201).json({ variant: decorateVariant(hydrated) });
}

/**
 * Update variant.
 */
export async function updateProductVariant(req, res) {
  await ensureVariant(req.params.variantId, req.params.productId);
  await updateVariant(req.params.variantId, req.validated.body);
  const hydrated = await getVariantWithDetails(req.params.variantId);
  res.json({ variant: decorateVariant(hydrated) });
}

/**
 * Delete variant.
 */
export async function deleteProductVariant(req, res) {
  await ensureVariant(req.params.variantId, req.params.productId);
  const result = await deleteVariant(req.params.variantId);
  res.json(result);
}

/**
 * Generate matrix and return hydrated variants.
 */
export async function generateProductVariantsMatrix(req, res) {
  await ensureProduct(req.params.productId);
  const variants = await generateVariantMatrix(req.params.productId, req.validated.body || {});
  res.json({ items: variants.map(decorateVariant) });
}

/**
 * Get variant details with attribute information.
 */
export async function getProductVariant(req, res) {
  await ensureVariant(req.params.variantId, req.params.productId);
  const variant = await getVariantWithDetails(req.params.variantId);
  res.json({ variant: decorateVariant(variant) });
}

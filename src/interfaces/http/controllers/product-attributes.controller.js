import { Product } from '../../../modules/catalog/product.model.js';
import {
  listAttributesWithOptions,
  createAttribute,
  updateAttribute,
  deleteAttribute
} from '../../../modules/catalog/attribute.service.js';
import { listOptions, createOption, updateOption, deleteOption } from '../../../modules/catalog/option.service.js';
import { ProductAttribute } from '../../../modules/catalog/product-attribute.model.js';
import { ProductOption } from '../../../modules/catalog/product-option.model.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';

async function ensureProduct(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  return product;
}

async function ensureAttribute(attributeId, productId) {
  const attribute = await ProductAttribute.findById(attributeId).lean();
  if (!attribute || (productId && String(attribute.product) !== String(productId))) {
    throw errors.notFound(ERROR_CODES.ATTRIBUTE_NOT_FOUND);
  }
  return attribute;
}

async function ensureOption(optionId, attributeId) {
  const option = await ProductOption.findById(optionId).lean();
  if (!option || String(option.attribute) !== String(attributeId)) {
    throw errors.notFound(ERROR_CODES.OPTION_NOT_FOUND);
  }
  return option;
}

/**
 * List attributes with nested options for a product.
 */
export async function listProductAttributes(req, res) {
  await ensureProduct(req.params.productId);
  const items = await listAttributesWithOptions(req.params.productId);
  res.json({ items });
}

/**
 * Create an attribute for the product.
 */
export async function createProductAttribute(req, res) {
  await ensureProduct(req.params.productId);
  const attribute = await createAttribute(req.params.productId, req.validated.body);
  res.status(201).json({ attribute });
}

/**
 * Update attribute metadata.
 */
export async function updateProductAttribute(req, res) {
  await ensureAttribute(req.params.attributeId, req.params.productId);
  const attribute = await updateAttribute(req.params.attributeId, req.validated.body);
  res.json({ attribute });
}

/**
 * Delete an attribute along with its options/variants.
 */
export async function deleteProductAttribute(req, res) {
  await ensureAttribute(req.params.attributeId, req.params.productId);
  const result = await deleteAttribute(req.params.attributeId);
  res.json(result);
}

/**
 * List options for an attribute.
 */
export async function listAttributeOptions(req, res) {
  await ensureAttribute(req.params.attributeId, req.params.productId);
  const options = await listOptions(req.params.attributeId);
  res.json({ items: options });
}

/**
 * Create option within an attribute scope.
 */
export async function createAttributeOption(req, res) {
  await ensureAttribute(req.params.attributeId, req.params.productId);
  const option = await createOption(req.params.attributeId, req.validated.body);
  res.status(201).json({ option });
}

/**
 * Update option metadata.
 */
export async function updateAttributeOption(req, res) {
  await ensureAttribute(req.params.attributeId, req.params.productId);
  await ensureOption(req.params.optionId, req.params.attributeId);
  const option = await updateOption(req.params.optionId, req.validated.body);
  res.json({ option });
}

/**
 * Delete option and dependent variants.
 */
export async function deleteAttributeOption(req, res) {
  await ensureAttribute(req.params.attributeId, req.params.productId);
  await ensureOption(req.params.optionId, req.params.attributeId);
  const result = await deleteOption(req.params.optionId);
  res.json(result);
}

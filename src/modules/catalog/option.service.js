import slugify from 'slugify';
import { ProductAttribute } from './product-attribute.model.js';
import { ProductOption } from './product-option.model.js';
import { ProductVariant } from './product-variant.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

function normalizeSlug(value) {
  return slugify(value, { lower: true, strict: true });
}

async function resolveAttribute(attributeId) {
  const attribute = await ProductAttribute.findById(attributeId);
  if (!attribute) throw errors.notFound(ERROR_CODES.ATTRIBUTE_NOT_FOUND);
  return attribute;
}

/**
 * List options for an attribute sorted by sort order.
 */
export async function listOptions(attributeId) {
  return ProductOption.find({ attribute: attributeId }).sort({ sortOrder: 1, name: 1 });
}

/**
 * Create option tied to attribute/product.
 */
export async function createOption(attributeId, payload) {
  const attribute = await resolveAttribute(attributeId);
  const data = preparePayload(payload);
  await assertUnique(attribute._id, data);
  const option = await ProductOption.create({ ...data, attribute: attributeId, product: attribute.product });
  return option;
}

/**
 * Update option metadata.
 */
export async function updateOption(optionId, payload) {
  const option = await ProductOption.findById(optionId);
  if (!option) throw errors.notFound(ERROR_CODES.OPTION_NOT_FOUND);
  const data = preparePayload(payload, option);
  await assertUnique(option.attribute, data, option._id);
  Object.assign(option, data);
  await option.save();
  return option;
}

/**
 * Delete option and remove affected variants.
 */
export async function deleteOption(optionId) {
  const option = await ProductOption.findById(optionId);
  if (!option) throw errors.notFound(ERROR_CODES.OPTION_NOT_FOUND);
  await ProductOption.deleteOne({ _id: optionId });
  await ProductVariant.deleteMany({ product: option.product, 'selections.option': optionId });
  return { success: true };
}

function preparePayload(payload = {}, existing) {
  const data = { ...payload };
  if (data.name) data.name = data.name.trim();
  if (data.slug) data.slug = normalizeSlug(data.slug);
  if (!data.slug && data.name && !existing) data.slug = normalizeSlug(data.name);
  if (typeof data.sortOrder !== 'undefined') data.sortOrder = Number(data.sortOrder) || 0;
  if (data.metadata && !(data.metadata instanceof Map)) {
    data.metadata = Object.entries(data.metadata).reduce((acc, [key, value]) => {
      acc.set(key, value);
      return acc;
    }, new Map());
  }
  return data;
}

async function assertUnique(attributeId, data, ignoreId) {
  const conditions = [];
  if (data.name) conditions.push({ attribute: attributeId, name: data.name });
  if (data.slug) conditions.push({ attribute: attributeId, slug: data.slug });
  if (!conditions.length) return;
  const query = { $or: conditions };
  if (ignoreId) query._id = { $ne: ignoreId };
  const existing = await ProductOption.findOne(query).lean();
  if (!existing) return;
  if (data.name && existing.name === data.name) throw errors.conflict(ERROR_CODES.OPTION_NAME_IN_USE);
  throw errors.conflict(ERROR_CODES.OPTION_SLUG_IN_USE);
}

import slugify from 'slugify';
import { ProductAttribute } from './product-attribute.model.js';
import { ProductOption } from './product-option.model.js';
import { ProductVariant } from './product-variant.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

function normalizeSlug(value) {
  return slugify(value, { lower: true, strict: true });
}

/**
 * Return attributes for a product sorted by sortOrder/name.
 */
export async function listAttributes(productId) {
  return ProductAttribute.find({ product: productId }).sort({ sortOrder: 1, name: 1 });
}

export async function listAttributesWithOptions(productId) {
  const [attributes, options] = await Promise.all([
    ProductAttribute.find({ product: productId }).sort({ sortOrder: 1, name: 1 }).lean(),
    ProductOption.find({ product: productId }).sort({ sortOrder: 1, name: 1 }).lean()
  ]);
  const grouped = attributes.map(attr => ({
    ...attr,
    options: options.filter(opt => String(opt.attribute) === String(attr._id))
  }));
  return grouped;
}

/**
 * Create a new attribute for a product with unique slug enforcement.
 */
export async function createAttribute(productId, payload) {
  const data = preparePayload(productId, payload);
  await assertUnique(productId, data);
  const attribute = await ProductAttribute.create({ ...data, product: productId });
  return attribute;
}

/**
 * Update attribute properties.
 */
export async function updateAttribute(id, payload) {
  const attribute = await ProductAttribute.findById(id);
  if (!attribute) throw errors.notFound(ERROR_CODES.ATTRIBUTE_NOT_FOUND);
  const data = preparePayload(attribute.product, payload, attribute);
  await assertUnique(attribute.product, data, attribute._id);
  Object.assign(attribute, data);
  await attribute.save();
  return attribute;
}

/**
 * Delete an attribute and cascade clean-up of options and variants.
 */
export async function deleteAttribute(id) {
  const attribute = await ProductAttribute.findById(id);
  if (!attribute) throw errors.notFound(ERROR_CODES.ATTRIBUTE_NOT_FOUND);
  const options = await ProductOption.find({ attribute: id }).select('_id');
  const optionIds = options.map(opt => opt._id);
  await Promise.all([
    ProductOption.deleteMany({ attribute: id }),
    ProductVariant.deleteMany({ product: attribute.product, 'selections.attribute': id })
  ]);
  await ProductAttribute.deleteOne({ _id: id });
  return {
    success: true,
    deletedOptions: optionIds.length
  };
}

function preparePayload(productId, payload = {}, existing) {
  const data = { ...payload };
  if (data.name) data.name = data.name.trim();
  if (data.slug) data.slug = normalizeSlug(data.slug);
  if (!data.slug && data.name && !existing) data.slug = normalizeSlug(data.name);
  if (typeof data.isRequired === 'string') data.isRequired = data.isRequired === 'true';
  if (typeof data.sortOrder !== 'undefined') data.sortOrder = Number(data.sortOrder) || 0;
  return data;
}

async function assertUnique(productId, data, ignoreId) {
  const conditions = [];
  if (data.name) conditions.push({ product: productId, name: data.name });
  if (data.slug) conditions.push({ product: productId, slug: data.slug });
  if (!conditions.length) return;
  const query = { $or: conditions };
  if (ignoreId) query._id = { $ne: ignoreId };
  const existing = await ProductAttribute.findOne(query).lean();
  if (!existing) return;
  if (data.name && existing.name === data.name) throw errors.conflict(ERROR_CODES.ATTRIBUTE_NAME_IN_USE);
  throw errors.conflict(ERROR_CODES.ATTRIBUTE_SLUG_IN_USE);
}

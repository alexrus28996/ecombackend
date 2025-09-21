import { z } from 'zod';

const attributeBase = {
  name: z.string().min(1, 'Attribute name required'),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
  isRequired: z.coerce.boolean().optional()
};

export const attributeCreateSchema = { body: z.object(attributeBase) };
export const attributeUpdateSchema = {
  body: z.object({
    name: attributeBase.name.optional(),
    slug: attributeBase.slug,
    description: attributeBase.description,
    sortOrder: attributeBase.sortOrder,
    isRequired: attributeBase.isRequired
  })
};

const optionBase = {
  name: z.string().min(1, 'Option name required'),
  slug: z.string().min(1).optional(),
  sortOrder: z.coerce.number().optional(),
  metadata: z.record(z.string()).optional()
};

export const optionCreateSchema = { body: z.object(optionBase) };
export const optionUpdateSchema = {
  body: z.object({
    name: optionBase.name.optional(),
    slug: optionBase.slug,
    sortOrder: optionBase.sortOrder,
    metadata: optionBase.metadata
  })
};

const selectionSchema = z.object({
  attribute: z.string().min(1),
  option: z.string().min(1)
});

const variantBase = {
  sku: z.string().min(1),
  selections: z.array(selectionSchema).min(1),
  priceOverride: z.coerce.number().nonnegative().optional(),
  priceDelta: z.coerce.number().optional(),
  stock: z.coerce.number().nonnegative().optional(),
  barcode: z.string().optional(),
  isActive: z.coerce.boolean().optional()
};

export const variantCreateSchema = { body: z.object(variantBase) };
export const variantUpdateSchema = {
  body: z.object({
    sku: variantBase.sku.optional(),
    selections: variantBase.selections.optional(),
    priceOverride: variantBase.priceOverride,
    priceDelta: variantBase.priceDelta,
    stock: variantBase.stock,
    barcode: variantBase.barcode,
    isActive: variantBase.isActive
  })
};

export const variantMatrixSchema = {
  body: z.object({
    skuPrefix: z.string().min(1).optional(),
    defaults: z.object({
      priceOverride: z.coerce.number().nonnegative().optional(),
      priceDelta: z.coerce.number().optional(),
      stock: z.coerce.number().nonnegative().optional()
    }).optional()
  })
};

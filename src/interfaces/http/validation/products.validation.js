import { z } from 'zod';
import { config } from '../../../config/index.js';

const sanitizedStringArray = z
  .array(z.string().trim().min(1))
  .transform((values) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))));

const dimensionsSchema = z
  .object({
    length: z.coerce.number().nonnegative().optional(),
    width: z.coerce.number().nonnegative().optional(),
    height: z.coerce.number().nonnegative().optional(),
    unit: z.string().optional()
  })
  .partial()
  .strict();

const base = {
  name: z.string().min(2),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  currency: z.string().default(config.DEFAULT_CURRENCY),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).optional(),
  attributes: z.record(z.string()).optional(),
  vendor: z.string().optional(),
  taxClass: z.string().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  weightUnit: z.string().optional(),
  dimensions: dimensionsSchema.optional(),
  tags: sanitizedStringArray.optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: sanitizedStringArray.optional(),
  isActive: z.coerce.boolean().optional(),
  brandId: z.string().optional()
};

export const productCreateSchema = { body: z.object({ ...base, category: z.string() }) };
export const productUpdateSchema = {
  body: z.object({
    ...base,
    brandId: z.string().nullable().optional(),
    category: z.string().optional()
  })
};

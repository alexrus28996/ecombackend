import { z } from 'zod';
import { config } from '../../../config/index.js';

const base = {
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  currency: z.string().default(config.DEFAULT_CURRENCY),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).optional(),
  attributes: z.record(z.string()).optional(),
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

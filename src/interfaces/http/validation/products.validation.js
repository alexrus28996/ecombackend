import { z } from 'zod';
import { config } from '../../../config/index.js';

export const productSchema = {
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.coerce.number().nonnegative(),
    currency: z.string().default(config.DEFAULT_CURRENCY),
    images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).optional(),
    attributes: z.record(z.string()).optional(),
    category: z.string().optional(),
    variants: z.array(z.object({
      sku: z.string().optional(),
      attributes: z.record(z.string()).optional(),
      price: z.coerce.number().nonnegative().optional(),
      priceDelta: z.coerce.number().optional(),
      stock: z.coerce.number().int().nonnegative().default(0),
      isActive: z.coerce.boolean().optional()
    })).optional(),
    stock: z.coerce.number().int().nonnegative().default(0),
    isActive: z.coerce.boolean().optional()
  })
};


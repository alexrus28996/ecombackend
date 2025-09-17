import { z } from 'zod';

export const addSchema = { body: z.object({ productId: z.string(), variantId: z.string().optional(), quantity: z.coerce.number().int().positive().default(1) }) };
export const updateSchema = { body: z.object({ quantity: z.coerce.number().int().positive(), variantId: z.string().optional() }), params: z.object({ productId: z.string() }) };
export const couponSchema = { body: z.object({ code: z.string().min(2) }) };
export const estimateSchema = { body: z.object({ shipping: z.coerce.number().nonnegative().optional(), taxRate: z.coerce.number().min(0).max(1).optional() }).optional() };

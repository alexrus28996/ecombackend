import { z } from 'zod';

export const brandSchema = { body: z.object({ name: z.string().min(2), slug: z.string().optional(), description: z.string().optional(), isActive: z.coerce.boolean().optional() }) };
export const idParam = { params: z.object({ id: z.string() }) };


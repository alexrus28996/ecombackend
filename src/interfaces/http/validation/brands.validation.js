import { z } from 'zod';

const base = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  isActive: z.coerce.boolean().optional()
});

export const brandSchema = { body: base };
export const brandUpdateSchema = { params: z.object({ id: z.string() }), body: base.partial() };
export const idParam = { params: z.object({ id: z.string() }) };


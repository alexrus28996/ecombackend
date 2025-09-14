import { z } from 'zod';

export const categorySchema = {
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).optional(),
    description: z.string().optional(),
    parent: z.string().nullable().optional()
  })
};

export const reorderSchema = { body: z.object({ ids: z.array(z.string()).min(1) }) };


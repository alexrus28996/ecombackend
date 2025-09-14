import { z } from 'zod';

export const upsertSchema = { body: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().optional() }) };


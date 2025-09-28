import { z } from 'zod';

export const paymentEventsListSchema = {
  query: z.object({
    provider: z.string().optional(),
    type: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional()
  })
};

export const paymentEventIdSchema = {
  params: z.object({ id: z.string().min(1) })
};

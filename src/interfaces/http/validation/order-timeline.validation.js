import { z } from 'zod';

export const orderTimelineCreateSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    type: z.string().min(1),
    message: z.string().min(1),
    meta: z.record(z.any()).optional()
  })
};

import { z } from 'zod';

export const releaseReservationsSchema = {
  params: z.object({ orderId: z.string().min(1) }),
  body: z.object({
    reason: z.string().optional(),
    notes: z.string().optional()
  }).optional()
};

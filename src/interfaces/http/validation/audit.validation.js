import { z } from 'zod';

export const auditListQuery = {
  query: z.object({
    user: z.string().optional(),
    method: z.string().optional(),
    status: z.coerce.number().int().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    path: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional()
  })
};

export const auditIdParam = {
  params: z.object({ id: z.string() })
};

import { z } from 'zod';

export const locationCreateSchema = {
  body: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['WAREHOUSE', 'STORE', 'DROPSHIP', 'BUFFER']).optional(),
    geo: z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional()
      })
      .partial()
      .optional(),
    priority: z.coerce.number().int().optional(),
    active: z.coerce.boolean().optional(),
    metadata: z.record(z.any()).optional()
  })
};

export const locationUpdateSchema = {
  body: locationCreateSchema.body.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required'
  })
};

export const locationIdParam = {
  params: z.object({ id: z.string().min(1) })
};

export const locationListQuery = {
  query: z.object({
    type: z.string().optional(),
    active: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    state: z.enum(['active', 'deleted', 'all']).optional()
  })
};

const transferLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qty: z.coerce.number().positive()
});

export const transferCreateSchema = {
  body: z.object({
    fromLocationId: z.string().min(1),
    toLocationId: z.string().min(1),
    lines: z.array(transferLineSchema).min(1),
    metadata: z.record(z.any()).optional()
  })
};

export const transferUpdateSchema = {
  body: z
    .object({
      fromLocationId: z.string().min(1).optional(),
      toLocationId: z.string().min(1).optional(),
      lines: z.array(transferLineSchema).min(1).optional(),
      metadata: z.record(z.any()).optional()
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' })
};

export const transferStatusSchema = {
  body: z.object({ status: z.enum(['DRAFT', 'REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED']) }),
  params: z.object({ id: z.string().min(1) })
};

export const transferListQuery = {
  query: z.object({
    status: z.string().optional(),
    fromLocationId: z.string().optional(),
    toLocationId: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
};

export const ledgerListQuery = {
  query: z.object({
    productId: z.string().optional(),
    variantId: z.string().optional(),
    locationId: z.string().optional(),
    direction: z.enum(['IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional()
  })
};

export const ledgerIdParam = {
  params: z.object({ id: z.string().min(1) })
};

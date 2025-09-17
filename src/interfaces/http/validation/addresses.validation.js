import { z } from 'zod';

export const idParam = { params: z.object({ id: z.string().min(1) }) };

export const addressBody = z.object({
  type: z.enum(['shipping', 'billing']),
  fullName: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  label: z.string().optional(),
  isDefault: z.coerce.boolean().optional()
});

export const createAddressSchema = { body: addressBody };
export const updateAddressSchema = { ...idParam, body: addressBody.partial() };


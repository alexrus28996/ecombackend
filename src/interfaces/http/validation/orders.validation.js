import { z } from 'zod';

const address = z.object({
  fullName: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional()
});

export const createOrderSchema = {
  body: z.object({
    shippingAddress: address.optional(),
    billingAddress: address.optional(),
    shipping: z.coerce.number().nonnegative().default(0),
    taxRate: z.coerce.number().min(0).max(1).default(0)
  })
};

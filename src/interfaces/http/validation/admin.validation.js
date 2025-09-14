import { z } from 'zod';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../../config/constants.js';

export const idParam = { params: z.object({ id: z.string().min(1) }) };

export const updateUserSchema = { body: z.object({ isActive: z.boolean().optional() }) };

export const updateOrderSchema = {
  body: z.object({
    status: z.enum([ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED]).optional(),
    paymentStatus: z.enum([PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED]).optional()
  }),
  params: z.object({ id: z.string() })
};

export const couponSchema = { body: z.object({ code: z.string().min(2), description: z.string().optional(), type: z.enum(['percent', 'fixed']), value: z.coerce.number().nonnegative(), minSubtotal: z.coerce.number().nonnegative().optional(), expiresAt: z.string().datetime().optional(), isActive: z.coerce.boolean().optional() }) };

export const adjustSchema = { body: z.object({ productId: z.string(), variantId: z.string().optional(), location: z.string().nullable().optional(), qtyChange: z.coerce.number().int(), reason: z.enum(['manual','order','refund','restock','correction']).default('manual'), note: z.string().optional() }) };

export const importSchema = { body: z.object({ items: z.array(z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  currency: z.string().optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
  attributes: z.record(z.string()).optional(),
  category: z.string().optional(),
  variants: z.array(z.object({ sku: z.string().optional(), attributes: z.record(z.string()).optional(), price: z.coerce.number().optional(), priceDelta: z.coerce.number().optional(), stock: z.coerce.number().int().nonnegative().optional(), isActive: z.coerce.boolean().optional() })).optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  isActive: z.coerce.boolean().optional(),
  slug: z.string().optional()
})) }) };

export const priceBulkSchema = { body: z.object({
  factorPercent: z.coerce.number().refine((v) => v > -100, { message: 'percent must be > -100' }),
  filter: z.object({ q: z.string().optional(), category: z.string().optional() }).partial().optional()
}) };

export const categoryBulkSchema = { body: z.object({ categoryId: z.string(), productIds: z.array(z.string()).min(1) }) };


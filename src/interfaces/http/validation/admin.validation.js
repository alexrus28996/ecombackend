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

export const returnApproveSchema = {
  params: z.object({ id: z.string() }),
  body: z.object({
    items: z.array(z.object({ product: z.string(), variant: z.string().optional(), quantity: z.coerce.number().int().min(1), locationId: z.string().optional() })).optional(),
    amount: z.coerce.number().min(0).optional(),
    locationId: z.string().optional()
  }).optional()
};

export const couponSchema = {
  body: z.object({
    code: z.string().min(2),
    description: z.string().optional(),
    type: z.enum(['percent', 'fixed']),
    value: z.coerce.number().nonnegative(),
    minSubtotal: z.coerce.number().nonnegative().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.coerce.boolean().optional(),
    includeCategories: z.array(z.string().min(1)).optional(),
    excludeCategories: z.array(z.string().min(1)).optional(),
    includeProducts: z.array(z.string().min(1)).optional(),
    excludeProducts: z.array(z.string().min(1)).optional(),
    perUserLimit: z.coerce.number().int().min(0).optional(),
    globalLimit: z.coerce.number().int().min(0).optional()
  })
};

export const adjustSchema = {
  body: z.object({
    productId: z.string(),
    variantId: z.string().optional().nullable(),
    locationId: z.string(),
    qtyChange: z.coerce.number().int(),
    reservedChange: z.coerce.number().int().optional(),
    reason: z.string().min(2).default('manual'),
    note: z.string().optional(),
    refId: z.string().optional()
  })
};

export const importSchema = { body: z.object({ items: z.array(z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  currency: z.string().optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
  attributes: z.record(z.string()).optional(),
  category: z.string().optional(),
  variants: z.array(z.object({ sku: z.string().optional(), attributes: z.record(z.string()).optional(), price: z.coerce.number().optional(), priceDelta: z.coerce.number().optional(), isActive: z.coerce.boolean().optional() })).optional(),
  isActive: z.coerce.boolean().optional(),
  slug: z.string().optional()
})) }) };

export const priceBulkSchema = { body: z.object({
  factorPercent: z.coerce.number().refine((v) => v > -100, { message: 'percent must be > -100' }),
  filter: z.object({ q: z.string().optional(), category: z.string().optional() }).partial().optional()
}) };

export const categoryBulkSchema = { body: z.object({ categoryId: z.string(), productIds: z.array(z.string()).min(1) }) };

export const shipmentCreateSchema = { params: z.object({ id: z.string() }), body: z.object({
  carrier: z.string().optional(),
  service: z.string().optional(),
  tracking: z.string().optional(),
  items: z.array(z.object({ product: z.string(), variant: z.string().optional(), name: z.string().optional(), quantity: z.coerce.number().int().min(1) })).optional()
}) };

export const variantsMatrixSchema = { body: z.object({
  options: z.record(z.array(z.string().min(1)).min(1)),
  base: z.object({ price: z.coerce.number().nonnegative().optional(), skuPrefix: z.string().optional() }).optional()
}) };



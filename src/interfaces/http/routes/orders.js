import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { createOrderFromCart, listOrders, getOrder } from '../../../modules/orders/order.service.js';

/**
 * Order routes: create from cart, list, and get by id.
 */
export const router = Router();

router.use(authRequired);

// Validation schemas
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

const createOrderSchema = {
  body: z.object({
    shippingAddress: address.optional(),
    shipping: z.coerce.number().nonnegative().default(0),
    taxRate: z.coerce.number().min(0).max(1).default(0)
  })
};

// Create an order from the current user's cart
router.post('/', validate(createOrderSchema), async (req, res) => {
  const order = await createOrderFromCart(req.user.sub, req.validated.body);
  res.status(201).json({ order });
});

// List current user's orders
router.get('/', async (req, res) => {
  const { limit, page } = req.query;
  const result = await listOrders(req.user.sub, { limit, page });
  res.json(result);
});

// Get order by id for current user
router.get('/:id', async (req, res) => {
  const order = await getOrder(req.user.sub, req.params.id);
  res.json({ order });
});

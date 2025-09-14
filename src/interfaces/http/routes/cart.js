import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../../../modules/cart/cart.service.js';

/**
 * Cart routes: get, add/update/remove items, clear.
 */
export const router = Router();

router.use(authRequired);

// Fetch current user's active cart
router.get('/', async (req, res) => {
  const cart = await getCart(req.user.sub);
  res.json({ cart });
});

// Payload schemas
const addSchema = { body: z.object({ productId: z.string(), quantity: z.coerce.number().int().positive().default(1) }) };
// Add an item to the cart
router.post('/items', validate(addSchema), async (req, res) => {
  const cart = await addItem(req.user.sub, req.validated.body);
  res.status(201).json({ cart });
});

const updateSchema = { body: z.object({ quantity: z.coerce.number().int().positive() }), params: z.object({ productId: z.string() }) };
// Update quantity of an item in the cart
router.patch('/items/:productId', validate(updateSchema), async (req, res) => {
  const cart = await updateItem(req.user.sub, { productId: req.validated.params.productId, quantity: req.validated.body.quantity });
  res.json({ cart });
});

// Remove an item from the cart
router.delete('/items/:productId', async (req, res) => {
  const cart = await removeItem(req.user.sub, { productId: req.params.productId });
  res.json({ cart });
});

// Remove all items from the cart
router.post('/clear', async (req, res) => {
  const cart = await clearCart(req.user.sub);
  res.json({ cart });
});

import { Router } from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import {
  getCart as getCartController,
  addItem as addItemController,
  updateItem as updateItemController,
  removeItem as removeItemController,
  clearCart as clearCartController,
  applyCoupon as applyCouponController,
  removeCoupon as removeCouponController
} from '../controllers/cart.controller.js';
import { addSchema, updateSchema, couponSchema } from '../validation/cart.validation.js';

/**
 * Cart routes: get, add/update/remove items, clear.
 */
export const router = Router();

router.use(authRequired);

// Fetch current user's active cart
router.get('/', getCartController);

// Payload schemas
// Add an item to the cart
router.post('/items', validate(addSchema), addItemController);

// Update quantity of an item in the cart
router.patch('/items/:productId', validate(updateSchema), updateItemController);

// Remove an item from the cart
router.delete('/items/:productId', removeItemController);

// Remove all items from the cart
router.post('/clear', clearCartController);

// Apply a coupon code
router.post('/coupon', validate(couponSchema), applyCouponController);

// Remove coupon
router.delete('/coupon', removeCouponController);

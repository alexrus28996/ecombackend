import { Router } from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { idempotency } from '../../../middleware/idempotency.js';
import {
  createOrder as createOrderController,
  listOrders as listOrdersController,
  getOrder as getOrderController,
  getInvoice as getInvoiceController,
  getTimeline as getTimelineController,
  requestReturn as requestReturnController
} from '../controllers/orders.controller.js';
import { createOrderSchema } from '../validation/orders.validation.js';
import { config } from '../../../config/index.js';

/**
 * Order routes: create from cart, list, and get by id.
 */
export const router = Router();

router.use(authRequired);

// Create an order from the current user's cart
router.post('/', idempotency, validate(createOrderSchema), createOrderController);

// List current user's orders
router.get('/', listOrdersController);

// Get order by id for current user
router.get('/:id', getOrderController);

// Download invoice (PDF)
router.get('/:id/invoice', getInvoiceController);

// Order timeline for current user
router.get('/:id/timeline', getTimelineController);

// Request a return/refund for an order (entire order for now)
router.post('/:id/returns', requestReturnController);

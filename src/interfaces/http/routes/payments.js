import express from 'express';
import { Router } from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { createStripeIntent, stripeWebhook } from '../controllers/payments.controller.js';
import { createIntentSchema } from '../validation/payments.validation.js';

export const router = Router();

// Create a Stripe payment intent for an existing order
router.post('/stripe/intent', authRequired, validate(createIntentSchema), createStripeIntent);

// Stripe webhook: must receive raw body. See app.js for raw middleware on this path.
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

import { createPaymentIntentForOrder, constructStripeEvent, applyPaymentIntentSucceeded } from '../../../modules/payments/stripe.service.js';

export async function createStripeIntent(req, res) {
  const { orderId } = req.validated.body;
  const result = await createPaymentIntentForOrder(orderId, req.user.sub);
  res.json(result);
}

// Note: raw body parsing is configured in app.js on the webhook path.
export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = constructStripeEvent(req.body, sig);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await applyPaymentIntentSucceeded(event.data.object);
      break;
    default:
      break;
  }
  res.json({ received: true });
}


import Stripe from 'stripe';
import { config } from '../../config/index.js';
import { Order } from '../orders/order.model.js';
import { addTimeline } from '../orders/timeline.service.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;

function toMinorUnits(amount, currency) {
  const curr = String(currency || 'USD').toUpperCase();
  // Most currencies are 2 decimals; extend if you add JPY/KRW etc.
  const zeroDecimal = ['JPY', 'KRW'];
  return zeroDecimal.includes(curr) ? Math.round(amount) : Math.round(amount * 100);
}

export async function createPaymentIntentForOrder(orderId, userId) {
  if (!stripe) throw errors.internal('PAYMENTS_DISABLED');
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw errors.notFound(ERROR_CODES.ORDER_NOT_FOUND);
  if (order.paymentStatus === 'paid') return { clientSecret: null, alreadyPaid: true };

  const amount = toMinorUnits(order.total, order.currency);
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: (order.currency || 'USD').toLowerCase(),
    metadata: { orderId: order._id.toString(), userId },
    description: `Order ${order._id}`
  });
  order.paymentProvider = 'stripe';
  order.transactionId = intent.id;
  await order.save();
  return { clientSecret: intent.client_secret };
}

export function constructStripeEvent(rawBody, signature) {
  if (!stripe) throw errors.internal('PAYMENTS_DISABLED');
  const secret = config.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw errors.internal('WEBHOOK_SECRET_MISSING');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function applyPaymentIntentSucceeded(pi) {
  const orderId = pi?.metadata?.orderId;
  if (!orderId) return;
  const order = await Order.findById(orderId);
  if (!order) return;
  order.paymentStatus = 'paid';
  order.status = 'paid';
  order.paidAt = new Date();
  order.paymentProvider = 'stripe';
  order.transactionId = pi.id;
  await order.save();
  try { await addTimeline(order._id, { type: 'payment_succeeded', message: 'Payment succeeded (Stripe)' }); } catch {}
}

export async function refundPaymentIntent(paymentIntentId, amountCents) {
  if (!stripe) throw errors.internal('PAYMENTS_DISABLED');
  const params = { payment_intent: paymentIntentId };
  if (typeof amountCents === 'number' && amountCents > 0) params.amount = Math.floor(amountCents);
  const refund = await stripe.refunds.create(params);
  return refund;
}

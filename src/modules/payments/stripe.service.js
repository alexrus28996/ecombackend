import Stripe from 'stripe';
import { config } from '../../config/index.js';
import { Order } from '../orders/order.model.js';
import { PaymentEvent } from './payment-event.model.js';
import { PaymentTransaction } from './payment-transaction.model.js';
import { addTimeline } from '../orders/timeline.service.js';
import { t } from '../../i18n/index.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { convertReservationsToStock } from '../inventory/reservation.service.js';
import mongoose from 'mongoose';
import { getLogger } from '../../logger.js';

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;
const logger = getLogger().child({ module: 'payments-stripe' });

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
  // Idempotency: skip if we've processed this eventId already
  try {
    await PaymentEvent.create({ provider: 'stripe', eventId: pi.id, type: pi.type || 'payment_intent.succeeded', order: pi?.metadata?.orderId });
  } catch (e) {
    if (e?.code === 11000) return; // duplicate event
  }
  const orderId = pi?.metadata?.orderId;
  if (!orderId) return;
  const session = await mongoose.startSession();
  let order;
  let fallback = false;
  try {
    try {
      await session.withTransaction(async () => {
        order = await Order.findById(orderId).session(session);
        if (!order) return;
        order.paymentStatus = 'paid';
        order.status = 'paid';
        order.paidAt = new Date();
        order.paymentProvider = 'stripe';
        order.transactionId = pi.id;
        await order.save({ session });
        await convertReservationsToStock(order._id, { byUserId: order.user, session, note: 'stripe payment succeeded' });
        await PaymentTransaction.create([
          {
            order: order._id,
            provider: 'stripe',
            status: 'succeeded',
            amount: pi.amount_received ? pi.amount_received / 100 : order.total,
            currency: (order.currency || 'USD').toUpperCase(),
            providerRef: pi.id,
            raw: pi
          }
        ], { session });
      });
    } catch (e) {
      const msg = String(e && e.message || '');
      if (msg.includes('Transaction numbers are only allowed') || e?.codeName === 'IllegalOperation') {
        fallback = true;
      } else {
        throw e;
      }
    }
  } finally {
    try { await session.endSession(); } catch (err) {
      logger.warn({ err }, 'failed to end stripe payment session');
    }
  }

  if (fallback) {
    order = await Order.findById(orderId);
    if (!order) return;
    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.paidAt = new Date();
    order.paymentProvider = 'stripe';
    order.transactionId = pi.id;
    await order.save();
    await convertReservationsToStock(order._id, { byUserId: order.user, note: 'stripe payment succeeded' });
    try {
      await PaymentTransaction.create({
        order: order._id,
        provider: 'stripe',
        status: 'succeeded',
        amount: pi.amount_received ? pi.amount_received / 100 : order.total,
        currency: (order.currency || 'USD').toUpperCase(),
        providerRef: pi.id,
        raw: pi
      });
    } catch (err) {
      logger.error({ err, orderId: String(order._id) }, 'failed to record stripe payment transaction in fallback path');
    }
  }

  if (!order) return;
  try {
    await addTimeline(order._id, { type: 'payment_succeeded', message: t('timeline.payment_succeeded_stripe') });
  } catch (err) {
    logger.warn({ err, orderId: String(order._id) }, 'failed to append stripe payment timeline entry');
  }
}

export async function refundPaymentIntent(paymentIntentId, amountCents) {
  if (!stripe) throw errors.internal('PAYMENTS_DISABLED');
  const params = { payment_intent: paymentIntentId };
  if (typeof amountCents === 'number' && amountCents > 0) params.amount = Math.floor(amountCents);
  const refund = await stripe.refunds.create(params);
  return refund;
}

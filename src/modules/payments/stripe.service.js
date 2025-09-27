import Stripe from 'stripe';
import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { PAYMENT_METHOD } from '../../config/constants.js';
import { Order } from '../orders/order.model.js';
import { PaymentEvent } from './payment-event.model.js';
import { PaymentTransaction } from './payment-transaction.model.js';
import { Refund } from './refund.model.js';
import { addTimeline } from '../orders/timeline.service.js';
import { t } from '../../i18n/index.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { convertReservationsToStock } from '../inventory/reservation.service.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../config/constants.js';
import { getLogger } from '../../logger.js';

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;
const logger = getLogger().child({ module: 'payments-stripe' });

function toMinorUnits(amount, currency) {
  const curr = String(currency || 'USD').toUpperCase();
  // Most currencies are 2 decimals; extend if you add JPY/KRW etc.
  const zeroDecimal = ['JPY', 'KRW'];
  return zeroDecimal.includes(curr) ? Math.round(amount) : Math.round(amount * 100);
}

function fromMinorUnits(amount, currency) {
  if (typeof amount !== 'number') return 0;
  const curr = String(currency || 'USD').toUpperCase();
  const zeroDecimal = ['JPY', 'KRW'];
  return zeroDecimal.includes(curr) ? Math.round(amount) : amount / 100;
}

function isTransactionUnsupported(err) {
  const msg = String(err?.message || '');
  return msg.includes('Transaction numbers are only allowed') || err?.codeName === 'IllegalOperation';
}

export async function createPaymentIntentForOrder(orderId, userId) {
  if (!stripe) throw errors.serviceUnavailable(ERROR_CODES.PAYMENTS_NOT_CONFIGURED);
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw errors.notFound(ERROR_CODES.ORDER_NOT_FOUND);
  if (order.paymentMethod === PAYMENT_METHOD.COD) {
    throw errors.badRequest(ERROR_CODES.PAYMENT_METHOD_UNAVAILABLE, null, { message: 'Cash on delivery orders do not use Stripe' });
  }
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
  if (!stripe) throw errors.serviceUnavailable(ERROR_CODES.PAYMENTS_NOT_CONFIGURED);
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
        order.paymentStatus = PAYMENT_STATUS.PAID;
        order.status = ORDER_STATUS.PAID;
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
      if (isTransactionUnsupported(e)) {
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
    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.status = ORDER_STATUS.PAID;
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

function normalizeRefundStatus(status) {
  if (!status) return 'pending';
  const normalized = status.toLowerCase();
  if (normalized === 'succeeded') return 'succeeded';
  if (normalized === 'failed' || normalized === 'canceled') return 'failed';
  return 'pending';
}

async function upsertRefundDocument(refund) {
  if (!refund) return;
  const paymentIntentId = refund.payment_intent || refund.payment_intent_id;
  let order = null;
  if (refund.metadata?.orderId) {
    order = await Order.findById(refund.metadata.orderId);
  }
  if (!order && paymentIntentId) {
    order = await Order.findOne({ transactionId: paymentIntentId });
  }
  if (!order) {
    logger.warn({ refundId: refund.id, paymentIntentId }, 'stripe refund received for unknown order');
    return;
  }

  let transaction = null;
  if (paymentIntentId) {
    transaction = await PaymentTransaction.findOne({ order: order._id, providerRef: paymentIntentId });
  }

  const amount = fromMinorUnits(refund.amount, refund.currency || order.currency);
  const currency = (refund.currency || order.currency || 'USD').toUpperCase();
  const status = normalizeRefundStatus(refund.status);

  await Refund.findOneAndUpdate(
    { provider: 'stripe', providerRef: refund.id },
    {
      order: order._id,
      transaction: transaction?._id,
      provider: 'stripe',
      status,
      amount,
      currency,
      reason: refund.reason || refund.metadata?.reason || undefined,
      providerRef: refund.id,
      raw: refund
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (status === 'succeeded') {
    try {
      await PaymentTransaction.updateMany({ order: order._id, provider: 'stripe' }, { $set: { status: 'refunded' } });
    } catch (err) {
      logger.warn({ err, orderId: String(order._id) }, 'failed to flag payment transactions as refunded');
    }

    const totals = await Refund.aggregate([
      { $match: { order: order._id, status: 'succeeded' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } }
    ]);
    const totalRefunded = totals?.[0]?.amount || 0;
    let updated = false;
    if (totalRefunded >= (order.total ?? 0) - 0.01) {
      if (order.paymentStatus !== PAYMENT_STATUS.REFUNDED) {
        order.paymentStatus = PAYMENT_STATUS.REFUNDED;
        updated = true;
      }
      if (order.status !== ORDER_STATUS.REFUNDED) {
        order.status = ORDER_STATUS.REFUNDED;
        updated = true;
      }
    }
    if (updated) {
      try {
        await order.save();
      } catch (err) {
        logger.error({ err, orderId: String(order._id) }, 'failed to persist order status after refund');
      }
    }
    try {
      const decimals = ['JPY', 'KRW'].includes(currency) ? 0 : 2;
      const formattedAmount = amount.toFixed(decimals);
      await addTimeline(order._id, {
        type: 'refund_recorded',
        message: t('timeline.refund_recorded_stripe', { amount: formattedAmount, currency }),
        meta: { provider: 'stripe', refundId: refund.id, paymentIntent: paymentIntentId }
      });
    } catch (err) {
      logger.warn({ err, orderId: String(order._id) }, 'failed to append refund timeline entry');
    }
  }
}

export async function applyStripeRefundEvent(event) {
  if (!event?.id) return;
  try {
    await PaymentEvent.create({ provider: 'stripe', eventId: event.id, type: event.type, order: event.data?.object?.metadata?.orderId });
  } catch (err) {
    if (err?.code === 11000) return;
    throw err;
  }

  const payload = event.data?.object;
  if (!payload) return;
  const refunds = event.type === 'charge.refunded' && Array.isArray(payload?.refunds?.data) && payload.refunds.data.length
    ? payload.refunds.data
    : [payload];

  for (const refund of refunds) {
    try {
      await upsertRefundDocument(refund);
    } catch (err) {
      logger.error({ err, refundId: refund?.id }, 'failed to sync stripe refund');
    }
  }
}

export async function refundPaymentIntent(paymentIntentId, options = {}) {
  if (!stripe) throw errors.internal('PAYMENTS_DISABLED');
  const params = { payment_intent: paymentIntentId };
  const amountCents = options?.amountCents;
  if (typeof amountCents === 'number' && amountCents > 0) params.amount = Math.floor(amountCents);
  if (options?.metadata) params.metadata = options.metadata;
  const refund = await stripe.refunds.create(params);
  return refund;
}

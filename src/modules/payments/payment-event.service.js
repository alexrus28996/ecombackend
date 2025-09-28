import mongoose from 'mongoose';
import { PaymentEvent } from './payment-event.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

export async function listPaymentEvents({ provider, type, from, to, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (provider) filter.provider = provider;
  if (type) filter.type = type;
  if (from || to) {
    filter.receivedAt = {};
    if (from) filter.receivedAt.$gte = new Date(from);
    if (to) filter.receivedAt.$lte = new Date(to);
  }
  const l = Math.min(200, Math.max(1, Number(limit) || 50));
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    PaymentEvent.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(l).lean(),
    PaymentEvent.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l) || 1 };
}

export async function getPaymentEvent(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw errors.notFound(ERROR_CODES.PAYMENT_EVENT_NOT_FOUND, 'Payment event not found');
  }
  const event = await PaymentEvent.findById(id).lean();
  if (!event) throw errors.notFound(ERROR_CODES.PAYMENT_EVENT_NOT_FOUND, 'Payment event not found');
  return event;
}

import { OrderTimeline } from './timeline.model.js';

export async function addTimeline(orderId, { type, message, userId, from, to, meta } = {}) {
  return OrderTimeline.create({ order: orderId, user: userId || undefined, type, message, from, to, meta });
}

export async function listTimeline(orderId, { page = 1, limit = 20 } = {}) {
  const l = Math.max(1, Number(limit) || 20);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    OrderTimeline.find({ order: orderId }).sort({ createdAt: -1 }).skip(skip).limit(l),
    OrderTimeline.countDocuments({ order: orderId })
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}


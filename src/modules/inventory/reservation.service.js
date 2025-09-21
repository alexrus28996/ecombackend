import mongoose from 'mongoose';
import { Reservation } from './reservation.model.js';
import { Inventory } from './inventory.model.js';
import { adjustStock } from './inventory.service.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { getLogger } from '../../logger.js';

const logger = getLogger().child({ module: 'inventory-reservations' });
const DEFAULT_EXPIRY_MINUTES = Number(config.RESERVATION_EXPIRES_MINUTES || 30);

// TODO: Multi-location reservations, partial releases, reservation audit dashboard

function resolveExpiry(minutes) {
  const mins = Number.isFinite(minutes) ? Number(minutes) : DEFAULT_EXPIRY_MINUTES;
  const safeMinutes = Math.max(1, mins || DEFAULT_EXPIRY_MINUTES || 30);
  return new Date(Date.now() + safeMinutes * 60 * 1000);
}

async function incrementReservedQty({ productId, variantId, quantity, session }) {
  const qty = Math.max(1, Number(quantity));
  const baseFilter = { product: productId, variant: variantId || null, location: null };
  const filter = {
    ...baseFilter,
    $expr: { $gte: [{ $subtract: ['$qty', { $ifNull: ['$reservedQty', 0] }] }, qty] }
  };
  const update = { $inc: { reservedQty: qty }, $set: { updatedAt: new Date() } };
  const opts = { new: true, session: session || undefined };
  const updated = await Inventory.findOneAndUpdate(filter, update, opts);
  if (!updated) {
    const existingQuery = Inventory.findOne(baseFilter);
    if (session) existingQuery.session(session);
    const existing = await existingQuery;
    if (!existing) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
    throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);
  }
  return { inventory: updated, qty };
}

/**
 * Reserve inventory units for an order.
 * Ensures atomic increments on inventory reserved counts.
 */
export async function reserveOrderItems({ orderId, userId, items, session = null, expiresInMinutes, notes }) {
  if (!orderId) throw new Error('orderId is required to reserve inventory');
  if (!Array.isArray(items) || !items.length) return [];
  const expiryTimestamp = resolveExpiry(expiresInMinutes);
  const reservationDocs = [];
  const rollbackFns = [];

  for (const item of items) {
    const productId = item.productId || item.product || item.product_id;
    if (!productId) throw errors.badRequest(ERROR_CODES.PRODUCT_NOT_FOUND);
    const variantId = item.variantId || item.variant || item.variant_id || null;
    const qty = Math.max(1, Number(item.quantity || item.qty || item.reservedQty));
    const { qty: reservedQty } = await incrementReservedQty({ productId, variantId, quantity: qty, session });
    reservationDocs.push({
      orderId,
      userId: userId || undefined,
      productId,
      variantId: variantId || null,
      reservedQty,
      status: 'active',
      expiryTimestamp,
      notes
    });
    if (!session) {
      rollbackFns.push(async () => {
        await Inventory.updateOne(
          { product: productId, variant: variantId || null, location: null, reservedQty: { $gte: reservedQty } },
          { $inc: { reservedQty: -reservedQty } }
        );
      });
    }
    logger.info({ event: 'reservation.created', orderId, productId, variantId, reservedQty }, 'Reservation created');
  }

  try {
    const created = await Reservation.insertMany(reservationDocs, { session: session || undefined });
    return created;
  } catch (err) {
    if (!session) {
      await Promise.allSettled(rollbackFns.map((fn) => fn()));
    }
    throw err;
  }
}

/**
 * Release all active reservations for an order (cancel/expire).
 */
export async function releaseOrderReservations(orderId, { reason = 'cancelled', session = null, notes } = {}) {
  if (!orderId) return 0;
  const id = typeof orderId === 'string' ? new mongoose.Types.ObjectId(orderId) : orderId;
  const filter = { orderId: id, status: 'active' };
  const query = Reservation.find(filter);
  if (session) query.session(session);
  const reservations = await query;
  if (!reservations.length) return 0;

  for (const res of reservations) {
    const invQuery = Inventory.findOne({ product: res.productId, variant: res.variantId || null, location: null });
    if (session) invQuery.session(session);
    const invDoc = await invQuery;
    if (invDoc) {
      const currentReserved = Number(invDoc.reservedQty || 0);
      const newReserved = Math.max(0, currentReserved - Number(res.reservedQty || 0));
      invDoc.reservedQty = newReserved;
      invDoc.updatedAt = new Date();
      await invDoc.save({ session: session || undefined });
    }
    logger.info({
      event: 'reservation.released',
      orderId,
      reservationId: res._id,
      productId: res.productId,
      variantId: res.variantId,
      reservedQty: res.reservedQty,
      reason
    }, 'Reservation released');
  }

  const status = reason === 'expired' ? 'expired' : 'cancelled';
  const updateResult = await Reservation.updateMany(
    { orderId: id, status: 'active' },
    { $set: { status, releasedAt: new Date(), notes } },
    { session: session || undefined }
  );
  return updateResult.modifiedCount || reservations.length;
}

/**
 * Convert reservations into physical stock deductions after payment.
 */
export async function convertReservationsToStock(orderId, { byUserId, session = null, note } = {}) {
  if (!orderId) return 0;
  const query = Reservation.find({ orderId, status: 'active' });
  if (session) query.session(session);
  const reservations = await query;
  if (!reservations.length) return 0;

  for (const res of reservations) {
    await adjustStock({
      productId: res.productId,
      variantId: res.variantId || null,
      qtyChange: -Math.abs(res.reservedQty),
      reservedChange: -Math.abs(res.reservedQty),
      reason: 'order_payment',
      note: note || `Order ${orderId} payment`,
      byUserId,
      session
    });
    logger.info({
      event: 'reservation.converted',
      orderId,
      reservationId: res._id,
      productId: res.productId,
      variantId: res.variantId,
      reservedQty: res.reservedQty
    }, 'Reservation converted into stock deduction');
  }

  const update = await Reservation.updateMany(
    { orderId, status: 'active' },
    { $set: { status: 'converted', convertedAt: new Date() } },
    { session: session || undefined }
  );
  return update.modifiedCount || reservations.length;
}

/**
 * Expire reservations whose expiryTimestamp has elapsed.
 */
export async function expireStaleReservations({ limit = 200, now = new Date() } = {}) {
  const filter = { status: 'active', expiryTimestamp: { $lte: now } };
  const reservations = await Reservation.find(filter).sort({ expiryTimestamp: 1 }).limit(Math.max(1, limit));
  if (!reservations.length) return { expired: 0 };
  const orders = new Map();
  for (const res of reservations) {
    const key = String(res.orderId);
    if (!orders.has(key)) orders.set(key, []);
    orders.get(key).push(res);
  }
  let expired = 0;
  for (const [orderId] of orders) {
    const released = await releaseOrderReservations(orderId, { reason: 'expired', notes: 'auto-expired' });
    expired += released;
    logger.info({ event: 'reservation.expired', orderId, released }, 'Expired reservations released');
  }
  return { expired };
}

/**
 * Paginated reservation list for dashboards.
 */
export async function listReservations({ orderId, productId, status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (orderId) filter.orderId = orderId;
  if (productId) filter.productId = productId;
  if (status) filter.status = status;
  const l = Math.max(1, Math.min(Number(limit) || 20, 100));
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    Reservation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    Reservation.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}

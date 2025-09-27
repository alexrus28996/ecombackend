import mongoose from 'mongoose';
import { Reservation } from './reservation.model.js';
import { quotePickingPlan, allocatePickingPlan } from './services/picking.service.js';
import { adjustStockLevels } from './services/stock.service.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { getLogger } from '../../logger.js';

const logger = getLogger().child({ module: 'inventory-reservations' });
const DEFAULT_EXPIRY_MINUTES = Number(config.RESERVATION_EXPIRES_MINUTES || 30);

function resolveExpiry(minutes) {
  const mins = Number.isFinite(minutes) ? Number(minutes) : DEFAULT_EXPIRY_MINUTES;
  const safeMinutes = Math.max(1, mins || DEFAULT_EXPIRY_MINUTES || 30);
  return new Date(Date.now() + safeMinutes * 60 * 1000);
}

function normalizeItems(items) {
  return (items || []).map((item) => ({
    productId: item.productId || item.product || item.product_id,
    variantId: item.variantId || item.variant || item.variant_id || null,
    quantity: Math.max(1, Number(item.quantity || item.qty || 0))
  }));
}

function isClientSession(candidate) {
  if (!candidate) return false;
  const ClientSession = mongoose.mongo?.ClientSession;
  if (ClientSession && typeof ClientSession === 'function') {
    return candidate instanceof ClientSession;
  }
  return typeof candidate === 'object'
    && typeof candidate.startTransaction === 'function'
    && typeof candidate.commitTransaction === 'function';
}

export async function reserveOrderItems({
  orderId,
  userId,
  items,
  session = null,
  expiresInMinutes,
  notes,
  shipTo,
  splitAllowed = true
}) {
  if (!orderId) throw new Error('orderId is required to reserve inventory');
  const normalized = normalizeItems(items);
  if (!normalized.length) return [];
  const expiryTimestamp = resolveExpiry(expiresInMinutes);
  const existingSession = isClientSession(session) ? session : null;
  const run = async (txn) => {
    const planResult = await quotePickingPlan({ shipTo, items: normalized, splitAllowed });
    if (!planResult.plan.length || planResult.fillRate <= 0) {
      throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, 'No inventory available for reservation');
    }
    if (planResult.fillRate < 1) {
      throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, 'Unable to fully reserve requested quantity');
    }
    await allocatePickingPlan({ plan: planResult.plan, orderId, actor: userId, session: txn });
    const docs = [];
    for (const leg of planResult.plan) {
      for (const line of leg.items) {
        docs.push({
          orderId,
          userId: userId || undefined,
          productId: line.productId,
          variantId: line.variantId || null,
          locationId: leg.location._id,
          reservedQty: line.qty,
          status: 'active',
          expiryTimestamp,
          notes,
          metadata: { pickingScore: leg.score, slaDays: leg.sla?.days }
        });
      }
    }
    const created = await Reservation.insertMany(docs, { session: txn });
    for (const res of created) {
      logger.info({ event: 'reservation.created', orderId, reservationId: res._id, locationId: res.locationId, reservedQty: res.reservedQty }, 'Reservation created');
    }
    return created;
  };
  if (existingSession) {
    return run(existingSession);
  }
  const newSession = await mongoose.startSession();
  try {
    const result = await newSession.withTransaction(run);
    return result;
  } finally {
    try {
      await newSession.endSession();
    } catch (err) {
      logger.warn({ err }, 'failed to end reservation session');
    }
  }
}

export async function releaseOrderReservations(orderId, { reason = 'cancelled', session = null, notes } = {}) {
  if (!orderId) return 0;
  const id = typeof orderId === 'string' ? new mongoose.Types.ObjectId(orderId) : orderId;
  const sess = isClientSession(session) ? session : null;
  const reservations = await Reservation.find({ orderId: id, status: 'active' }).session(sess).lean();
  if (!reservations.length) return 0;
  const adjustments = reservations.map((res) => ({
    productId: res.productId,
    variantId: res.variantId,
    locationId: res.locationId,
    reservedChange: -Math.abs(res.reservedQty),
    qtyChange: 0
  }));
  await adjustStockLevels({ adjustments, reason: 'RESERVATION_RELEASE', actor: String(reservations[0]?.userId || ''), refType: 'RESERVATION', refId: String(orderId), session: sess });
  await Reservation.updateMany(
    { orderId: id, status: 'active' },
    { $set: { status: reason === 'expired' ? 'expired' : 'cancelled', releasedAt: new Date(), notes } },
    { session: sess || undefined }
  );
  for (const res of reservations) {
    logger.info({ event: 'reservation.released', orderId, reservationId: res._id, reason }, 'Reservation released');
  }
  return reservations.length;
}

export async function convertReservationsToStock(orderId, { byUserId, session = null, note } = {}) {
  if (!orderId) return 0;
  const sess = isClientSession(session) ? session : null;
  const reservations = await Reservation.find({ orderId, status: 'active' }).session(sess);
  if (!reservations.length) return 0;
  const adjustments = reservations.map((res) => ({
    productId: res.productId,
    variantId: res.variantId,
    locationId: res.locationId,
    qtyChange: -Math.abs(res.reservedQty),
    reservedChange: -Math.abs(res.reservedQty)
  }));
  await adjustStockLevels({ adjustments, reason: 'FULFILLMENT', actor: byUserId, refType: 'ORDER', refId: String(orderId), session: sess });
  await Reservation.updateMany(
    { orderId, status: 'active' },
    { $set: { status: 'converted', convertedAt: new Date(), notes: note } },
    { session: sess || undefined }
  );
  for (const res of reservations) {
    logger.info({ event: 'reservation.converted', orderId, reservationId: res._id, locationId: res.locationId }, 'Reservation converted into stock deduction');
  }
  return reservations.length;
}

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

export async function listReservations({ orderId, productId, status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (orderId) filter.orderId = orderId;
  if (productId) filter.productId = productId;
  if (status) filter.status = status;
  const l = Math.max(1, Number(limit) || 20);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    Reservation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    Reservation.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}

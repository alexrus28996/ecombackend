import mongoose from 'mongoose';
import { StockItem } from '../models/stock-item.model.js';
import { StockLedger } from '../models/stock-ledger.model.js';
import { TransferOrder } from '../models/transfer-order.model.js';
import { Location } from '../models/location.model.js';
import { ProductVariant } from '../../catalog/product-variant.model.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';
import { haversineDistanceKm } from './geo.js';
import { getLogger } from '../../../logger.js';

const logger = getLogger().child({ module: 'inventory-stock' });

async function assertVariantBelongs(productId, variantId) {
  if (!variantId) return;
  const variant = await ProductVariant.findOne({ _id: variantId, product: productId }).select('_id product');
  if (!variant) {
    throw errors.badRequest(ERROR_CODES.VARIANT_NOT_FOUND, 'Variant does not belong to product');
  }
}

async function getLocationOrThrow(locationId) {
  const location = await Location.findOne({ _id: locationId, deletedAt: { $exists: false } });
  if (!location) throw errors.notFound(ERROR_CODES.RESOURCE_NOT_FOUND, 'Location not found');
  return location;
}

async function ensureStockDocument({ productId, variantId, locationId, session }) {
  let doc = await StockItem.findOne({ productId, variantId: variantId || null, locationId }).session(session || null);
  if (!doc) {
    const [created] = await StockItem.create([
      { productId, variantId: variantId || null, locationId }
    ], { session: session || undefined });
    doc = created;
  }
  return doc;
}

async function runWithSession(session, fn) {
  if (session) return fn(session);
  const ownSession = await mongoose.startSession();
  try {
    let result;
    await ownSession.withTransaction(async () => {
      result = await fn(ownSession);
    });
    return result;
  } finally {
    ownSession.endSession();
  }
}

async function writeLedger(entries, session) {
  if (!entries.length) return;
  await StockLedger.insertMany(entries.map((entry) => ({ ...entry, occurredAt: entry.occurredAt || new Date() })), {
    session: session || undefined
  });
  for (const entry of entries) {
    logger.info({ event: 'stock.ledger', ...entry }, 'Stock ledger entry created');
  }
}

function isDropship(location) {
  return location?.type === 'DROPSHIP';
}

export async function queryStock({
  productId,
  variantId,
  locationIds,
  region,
  country,
  radiusKm,
  shipTo,
  includeIncoming = false,
  includeReserved = false
} = {}) {
  const filter = {};
  if (productId) filter.productId = productId;
  if (variantId) filter.variantId = variantId;
  if (Array.isArray(locationIds) && locationIds.length) {
    filter.locationId = { $in: locationIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }
  const stockItems = await StockItem.find(filter).lean();
  if (!stockItems.length) return [];
  const locIds = [...new Set(stockItems.map((s) => String(s.locationId)))];
  const locationDocs = await Location.find({ _id: { $in: locIds }, deletedAt: { $exists: false } }).lean();
  const locationsMap = new Map(locationDocs.map((loc) => [String(loc._id), loc]));
  const target = shipTo || null;
  const output = [];
  for (const item of stockItems) {
    const location = locationsMap.get(String(item.locationId));
    if (!location) continue;
    if (typeof region === 'string' && location?.geo?.region && location.geo.region !== region) continue;
    if (typeof country === 'string' && location?.geo?.country && location.geo.country !== country) continue;
    if (Number.isFinite(radiusKm) && target) {
      const distance = haversineDistanceKm(location.geo || {}, target);
      if (distance === Number.POSITIVE_INFINITY || distance > radiusKm) continue;
    }
    const available = Math.max(0, Number(item.onHand || 0) - Number(item.reserved || 0));
    output.push({
      ...item,
      available,
      reserved: includeReserved ? Number(item.reserved || 0) : undefined,
      incoming: includeIncoming ? Number(item.incoming || 0) : undefined,
      location
    });
  }
  return output.sort((a, b) => (b.location?.priority || 0) - (a.location?.priority || 0));
}

export async function getAvailableStock(productId, variantId) {
  if (!productId) return 0;
  const items = await StockItem.find({ productId, variantId: variantId || null }).lean();
  if (!items.length) return 0;
  const locIds = [...new Set(items.map((item) => String(item.locationId)))];
  const locations = await Location.find({ _id: { $in: locIds }, deletedAt: { $exists: false }, active: true }).lean();
  const locationMap = new Map(locations.map((loc) => [String(loc._id), loc]));
  let total = 0;
  for (const item of items) {
    const location = locationMap.get(String(item.locationId));
    if (!location) continue;
    if (isDropship(location)) {
      return Number.POSITIVE_INFINITY;
    }
    total += Math.max(0, Number(item.onHand || 0) - Number(item.reserved || 0));
  }
  return total;
}

export async function listInventoryItems({ productId, variantId, locationId, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (productId) filter.productId = productId;
  if (typeof variantId !== 'undefined') filter.variantId = variantId || null;
  if (locationId) filter.locationId = locationId;
  const l = Math.min(200, Math.max(1, Number(limit) || 50));
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    StockItem.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(l).lean(),
    StockItem.countDocuments(filter)
  ]);
  const locIds = [...new Set(items.map((item) => String(item.locationId)))];
  const locations = await Location.find({ _id: { $in: locIds } }).lean();
  const locMap = new Map(locations.map((loc) => [String(loc._id), loc]));
  const enriched = items.map((item) => ({ ...item, location: locMap.get(String(item.locationId)) || null }));
  return { items: enriched, total, page: p, pages: Math.ceil(total / l) || 1 };
}

export async function listAdjustments({ productId, variantId, locationId, direction, reason, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (productId) filter.productId = productId;
  if (typeof variantId !== 'undefined') filter.variantId = variantId || null;
  if (locationId) filter.locationId = locationId;
  if (direction) filter.direction = direction;
  if (reason) filter.reason = reason;
  const l = Math.min(200, Math.max(1, Number(limit) || 50));
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    StockLedger.find(filter).sort({ occurredAt: -1 }).skip(skip).limit(l).lean(),
    StockLedger.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l) || 1 };
}

export async function adjustStockLevels({
  adjustments,
  reason,
  actor,
  refType = 'ADJUSTMENT',
  refId,
  session
}) {
  if (!Array.isArray(adjustments) || !adjustments.length) {
    throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'adjustments array required');
  }
  if (!reason) throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'reason is required');
  return runWithSession(session, async (txn) => {
    const ledgerEntries = [];
    const results = [];
    for (const adjustment of adjustments) {
      const { productId, variantId, locationId, qtyChange = 0, reservedChange = 0, incomingChange = 0 } = adjustment;
      if (!productId || !locationId) {
        throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'productId and locationId required');
      }
      await assertVariantBelongs(productId, variantId);
      const location = await getLocationOrThrow(locationId);
      const stock = await ensureStockDocument({ productId, variantId, locationId, session: txn });
      const onHand = Number(stock.onHand || 0) + Number(qtyChange || 0);
      const reserved = Number(stock.reserved || 0) + Number(reservedChange || 0);
      const incoming = Number(stock.incoming || 0) + Number(incomingChange || 0);
      const allowNegative = isDropship(location);
      if (!allowNegative && onHand < 0) {
        throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, 'Negative onHand not allowed');
      }
      if (reserved < 0) {
        throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, 'Negative reserved not allowed');
      }
      if (!allowNegative && onHand < reserved) {
        throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, 'Reserved exceeds onHand');
      }
      stock.onHand = onHand;
      stock.reserved = Math.max(0, reserved);
      stock.incoming = Math.max(0, incoming);
      stock.updatedAt = new Date();
      await stock.save({ session: txn });
      results.push(stock.toObject());
      if (qtyChange) {
        ledgerEntries.push({
          productId,
          variantId: variantId || null,
          locationId,
          qty: qtyChange,
          direction: qtyChange >= 0 ? 'IN' : 'OUT',
          reason,
          refType,
          refId,
          actor
        });
      }
      if (reservedChange) {
        ledgerEntries.push({
          productId,
          variantId: variantId || null,
          locationId,
          qty: reservedChange,
          direction: reservedChange >= 0 ? 'RESERVE' : 'RELEASE',
          reason: reason || 'RESERVATION',
          refType,
          refId,
          actor
        });
      }
      if (incomingChange) {
        ledgerEntries.push({
          productId,
          variantId: variantId || null,
          locationId,
          qty: incomingChange,
          direction: incomingChange >= 0 ? 'IN' : 'OUT',
          reason: reason || 'PO',
          refType: refType || 'PO',
          refId,
          actor
        });
      }
    }
    await writeLedger(ledgerEntries, txn);
    return results;
  });
}

export async function reconcileStock({
  productId,
  variantId,
  locationId,
  countedOnHand,
  countedReserved = null,
  reason = 'RECONCILIATION',
  actor,
  session
}) {
  if (!productId || !locationId) {
    throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'productId and locationId required');
  }
  return runWithSession(session, async (txn) => {
    await assertVariantBelongs(productId, variantId);
    await getLocationOrThrow(locationId);
    const stock = await ensureStockDocument({ productId, variantId, locationId, session: txn });
    const currentOnHand = Number(stock.onHand || 0);
    const currentReserved = Number(stock.reserved || 0);
    const qtyChange = Number(countedOnHand) - currentOnHand;
    const reservedChange = countedReserved === null || typeof countedReserved === 'undefined'
      ? 0
      : Number(countedReserved) - currentReserved;
    return adjustStockLevels({
      adjustments: [{ productId, variantId, locationId, qtyChange, reservedChange }],
      reason,
      actor,
      refType: 'ADJUSTMENT',
      refId: `reconcile:${Date.now()}`,
      session: txn
    });
  });
}

export async function createTransferOrder({ fromLocationId, toLocationId, lines, metadata, actor, session }) {
  if (!Array.isArray(lines) || !lines.length) {
    throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'transfer lines required');
  }
  return runWithSession(session, async (txn) => {
    await getLocationOrThrow(fromLocationId);
    await getLocationOrThrow(toLocationId);
    for (const line of lines) {
      await assertVariantBelongs(line.productId, line.variantId);
    }
    const transfer = await TransferOrder.create([
      { fromLocationId, toLocationId, lines, status: 'REQUESTED', metadata }
    ], { session: txn });
    logger.info({ event: 'transfer.created', transferId: transfer[0]._id, fromLocationId, toLocationId, actor }, 'Transfer created');
    return transfer[0].toObject();
  });
}

export async function transitionTransferOrder({ id, nextStatus, actor, session }) {
  const allowed = new Map([
    ['REQUESTED', ['IN_TRANSIT', 'CANCELLED']],
    ['IN_TRANSIT', ['RECEIVED', 'CANCELLED']]
  ]);
  return runWithSession(session, async (txn) => {
    const transfer = await TransferOrder.findById(id).session(txn);
    if (!transfer) throw errors.notFound(ERROR_CODES.RESOURCE_NOT_FOUND, 'Transfer order not found');
    if (transfer.status === 'CANCELLED' || transfer.status === 'RECEIVED') {
      throw errors.badRequest(ERROR_CODES.INVALID_STATE, 'Cannot transition completed transfer');
    }
    const allowedNext = allowed.get(transfer.status) || [];
    if (!allowedNext.includes(nextStatus)) {
      throw errors.badRequest(ERROR_CODES.INVALID_STATE, `Transition from ${transfer.status} to ${nextStatus} not allowed`);
    }
    transfer.status = nextStatus;
    await transfer.save({ session: txn });
    if (nextStatus === 'IN_TRANSIT') {
      const adjustments = transfer.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        locationId: transfer.fromLocationId,
        qtyChange: -Math.abs(line.qty),
        reason: 'TRANSFER',
        refType: 'TRANSFER',
        refId: String(transfer._id)
      }));
      await adjustStockLevels({ adjustments, reason: 'TRANSFER', actor, refType: 'TRANSFER', refId: String(transfer._id), session: txn });
    }
    if (nextStatus === 'RECEIVED') {
      const adjustments = transfer.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        locationId: transfer.toLocationId,
        qtyChange: Math.abs(line.qty),
        reason: 'TRANSFER',
        refType: 'TRANSFER',
        refId: String(transfer._id)
      }));
      await adjustStockLevels({ adjustments, reason: 'TRANSFER', actor, refType: 'TRANSFER', refId: String(transfer._id), session: txn });
    }
    logger.info({ event: 'transfer.transition', transferId: transfer._id, status: nextStatus, actor }, 'Transfer transitioned');
    return transfer.toObject();
  });
}

export async function listTransferOrders({ status, fromLocationId, toLocationId, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (fromLocationId) filter.fromLocationId = fromLocationId;
  if (toLocationId) filter.toLocationId = toLocationId;
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    TransferOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    TransferOrder.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l) || 1 };
}

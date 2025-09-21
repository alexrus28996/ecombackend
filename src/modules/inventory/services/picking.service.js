import mongoose from 'mongoose';
import { Location } from '../models/location.model.js';
import { StockItem } from '../models/stock-item.model.js';
import { adjustStockLevels } from './stock.service.js';
import { haversineDistanceKm } from './geo.js';
import { pickingConfig } from '../../../config/picking.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';
import { getLogger } from '../../../logger.js';

const logger = getLogger().child({ module: 'inventory-picking' });

function normalize(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max === 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

function buildItemKey(item) {
  return `${item.productId}:${item.variantId || 'base'}`;
}

function aggregateRequirements(items) {
  const req = new Map();
  for (const item of items) {
    const key = buildItemKey(item);
    const qty = Math.max(1, Number(item.qty || item.quantity || 0));
    req.set(key, (req.get(key) || 0) + qty);
  }
  return req;
}

function computeBaseScore({ location, distanceKm, availability }) {
  const weights = pickingConfig.weights;
  const priorityScore = normalize(location.priority || 0, 100);
  const distanceScore = distanceKm === null ? 0.5 : 1 / (1 + Math.max(distanceKm, 0));
  const availabilityFactor = Math.max(0, Math.min(1, Number.isFinite(availability) ? availability : 0));
  const handlingCost = Number(location.metadata?.get?.('handlingCost') ?? location.metadata?.handlingCost ?? 0);
  const handlingScore = handlingCost ? 1 / (1 + handlingCost) : 0.5;
  const ageScore = Number(location.metadata?.get?.('ageScore') ?? location.metadata?.ageScore ?? 0.5);
  const baseScore =
    weights.priority * priorityScore +
    weights.distance * distanceScore +
    weights.handlingCost * handlingScore +
    weights.age * ageScore;
  return baseScore * (0.5 + 0.5 * availabilityFactor);
}

function inferSla(distanceKm) {
  if (!Number.isFinite(distanceKm)) return { days: 5, category: 'standard' };
  if (distanceKm <= 50) return { days: 1, category: 'same_or_next_day' };
  if (distanceKm <= 250) return { days: 2, category: 'regional' };
  if (distanceKm <= 1000) return { days: 4, category: 'national' };
  return { days: 7, category: 'intl' };
}

async function fetchStockForItems({ locationIds, requirements }) {
  const query = {
    locationId: { $in: locationIds },
    $or: Array.from(requirements.keys()).map((key) => {
      const [productId, variant] = key.split(':');
      return { productId, variantId: variant === 'base' ? null : new mongoose.Types.ObjectId(variant) };
    })
  };
  const items = await StockItem.find(query).lean();
  const map = new Map();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId || 'base'}`;
    const locationKey = String(item.locationId);
    if (!map.has(locationKey)) map.set(locationKey, new Map());
    const available = Math.max(0, Number(item.onHand || 0) - Number(item.reserved || 0));
    map.get(locationKey).set(key, available);
  }
  return map;
}

export async function quotePickingPlan({ shipTo, items, splitAllowed }) {
  if (!Array.isArray(items) || !items.length) {
    throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'items required for picking quote');
  }
  const requirements = aggregateRequirements(items);
  const locations = await Location.find({ active: true, deletedAt: { $exists: false } }).lean();
  if (!locations.length) return { plan: [], fillRate: 0, split: false };
  const locationIds = locations.map((loc) => loc._id);
  const stockMap = await fetchStockForItems({ locationIds, requirements });
  const totalRequired = Array.from(requirements.values()).reduce((acc, qty) => acc + qty, 0);
  const candidates = [];
  const targetGeo = shipTo?.lat && shipTo?.lng ? { lat: shipTo.lat, lng: shipTo.lng } : null;
  const dropshipLocations = new Set();
  for (const loc of locations) {
    const key = String(loc._id);
    if (loc.type === 'DROPSHIP') {
      dropshipLocations.add(key);
    }
    const locationStock = stockMap.get(key) || new Map();
    let minAvailability = 1;
    for (const [itemKey, required] of requirements.entries()) {
      if (dropshipLocations.has(key)) continue;
      const available = locationStock.get(itemKey) || 0;
      const ratio = required > 0 ? available / required : 0;
      minAvailability = Math.min(minAvailability, ratio);
    }
    const distanceKm = targetGeo && loc.geo?.lat && loc.geo?.lng
      ? haversineDistanceKm({ lat: loc.geo.lat, lng: loc.geo.lng }, targetGeo)
      : null;
    const availabilityScore = dropshipLocations.has(key) ? 1 : Math.max(0, Math.min(1, minAvailability));
    const score = computeBaseScore({ location: loc, distanceKm: distanceKm ?? Infinity, availability: availabilityScore });
    candidates.push({ location: loc, availability: availabilityScore, score, distanceKm });
  }
  const sorted = candidates.sort((a, b) => b.score - a.score);
  const allocations = [];
  const remaining = new Map(requirements);
  const effectiveSplitAllowed = typeof splitAllowed === 'boolean' ? splitAllowed : pickingConfig.allowSplit;
  if (!effectiveSplitAllowed) {
    const best = sorted.find((candidate) => {
      if (dropshipLocations.has(String(candidate.location._id))) return true;
      for (const [itemKey, required] of requirements.entries()) {
        const available = (stockMap.get(String(candidate.location._id)) || new Map()).get(itemKey) || 0;
        if (available < required) return false;
      }
      return true;
    });
    if (!best) {
      return { plan: [], fillRate: 0, split: false, reason: 'NO_SINGLE_LOCATION' };
    }
    const planLines = Array.from(requirements.entries()).map(([itemKey, qty]) => {
      const [productId, variantId] = itemKey.split(':');
      return {
        productId,
        variantId: variantId === 'base' ? null : variantId,
        qty
      };
    });
    const sla = inferSla(best.distanceKm ?? Infinity);
    const plan = [{
      location: best.location,
      items: planLines,
      distanceKm: best.distanceKm,
      score: best.score,
      sla
    }];
    return { plan, fillRate: 1, split: false };
  }

  for (const candidate of sorted) {
    const locationKey = String(candidate.location._id);
    const locAllocations = [];
    const locationStock = stockMap.get(locationKey) || new Map();
    let allocatedAny = false;
    for (const [itemKey, required] of remaining.entries()) {
      if (required <= 0) continue;
      let available;
      if (dropshipLocations.has(locationKey)) {
        available = required;
      } else {
        available = locationStock.get(itemKey) || 0;
        if (available <= 0) continue;
      }
      const allocateQty = Math.min(required, available);
      if (allocateQty <= 0) continue;
      const [productId, variantId] = itemKey.split(':');
      locAllocations.push({ productId, variantId: variantId === 'base' ? null : variantId, qty: allocateQty });
      remaining.set(itemKey, required - allocateQty);
      allocatedAny = true;
    }
    if (allocatedAny) {
      const sla = inferSla(candidate.distanceKm ?? Infinity);
      allocations.push({
        location: candidate.location,
        items: locAllocations,
        distanceKm: candidate.distanceKm,
        score: candidate.score,
        sla
      });
    }
    const outstanding = Array.from(remaining.values()).reduce((acc, qty) => acc + Math.max(0, qty), 0);
    if (outstanding <= 0) break;
  }

  const allocatedQty = totalRequired - Array.from(remaining.values()).reduce((acc, qty) => acc + Math.max(0, qty), 0);
  const fillRate = totalRequired > 0 ? allocatedQty / totalRequired : 0;
  return { plan: allocations, fillRate, split: allocations.length > 1 };
}

export async function allocatePickingPlan({ plan, orderId, actor, reason = 'RESERVATION', session }) {
  if (!Array.isArray(plan) || !plan.length) {
    throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'plan required for allocation');
  }
  const adjustments = [];
  for (const leg of plan) {
    if (!leg.location || !leg.location._id) {
      throw errors.badRequest(ERROR_CODES.INVALID_INPUT, 'location missing on plan leg');
    }
    for (const item of leg.items || []) {
      adjustments.push({
        productId: item.productId,
        variantId: item.variantId,
        locationId: leg.location._id,
        reservedChange: Math.abs(item.qty),
        qtyChange: 0
      });
    }
  }
  const refId = orderId ? String(orderId) : undefined;
  const results = await adjustStockLevels({
    adjustments,
    reason,
    actor,
    refType: 'RESERVATION',
    refId,
    session
  });
  logger.info({ event: 'picking.allocated', orderId, adjustmentsCount: adjustments.length, actor }, 'Picking plan allocated');
  return results;
}

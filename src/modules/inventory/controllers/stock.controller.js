import { queryStock, adjustStockLevels, reconcileStock } from '../services/stock.service.js';

export async function queryStockController(req, res) {
  const { productId, variantId, locationId, region, country, radius, includeIncoming, includeReserved, lat, lng, pincode } = req.query;
  const locationIds = Array.isArray(locationId) ? locationId : locationId ? [locationId] : undefined;
  const shipTo = {};
  if (lat && lng) {
    shipTo.lat = Number(lat);
    shipTo.lng = Number(lng);
  }
  if (pincode) shipTo.pincode = pincode;
  const results = await queryStock({
    productId,
    variantId,
    locationIds,
    region,
    country,
    radiusKm: typeof radius === 'undefined' ? undefined : Number(radius),
    shipTo: shipTo.lat && shipTo.lng ? shipTo : undefined,
    includeIncoming: includeIncoming === 'true' || includeIncoming === true,
    includeReserved: includeReserved === 'true' || includeReserved === true
  });
  res.json({ items: results });
}

export async function adjustStockController(req, res) {
  const { adjustments, reason, refType, refId } = req.body;
  const actor = req.user?.sub;
  const result = await adjustStockLevels({ adjustments, reason, actor, refType, refId });
  res.status(202).json({ updated: result.length });
}

export async function reconcileStockController(req, res) {
  const { productId, variantId, locationId, countedOnHand, countedReserved, reason } = req.body;
  const actor = req.user?.sub;
  const [result] = await reconcileStock({
    productId,
    variantId,
    locationId,
    countedOnHand,
    countedReserved,
    reason,
    actor
  });
  res.json(result);
}

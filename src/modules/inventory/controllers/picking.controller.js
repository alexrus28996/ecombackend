import { quotePickingPlan, allocatePickingPlan } from '../services/picking.service.js';

export async function pickingQuoteController(req, res) {
  const payload = req.body || {};
  const result = await quotePickingPlan({ shipTo: payload.shipTo, items: payload.items || [], splitAllowed: payload.splitAllowed });
  res.json(result);
}

export async function pickingAllocateController(req, res) {
  const payload = req.body || {};
  const actor = req.user?.sub;
  const result = await allocatePickingPlan({ plan: payload.plan, orderId: payload.orderId, actor, reason: payload.reason });
  res.status(201).json({ reserved: result.length });
}

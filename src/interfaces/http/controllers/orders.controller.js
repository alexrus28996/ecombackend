import { createOrderFromCart as svcCreateFromCart, listOrders as svcList, getOrder as svcGet } from '../../../modules/orders/order.service.js';
import { listTimeline as svcListTimeline, addTimeline } from '../../../modules/orders/timeline.service.js';
import { ReturnRequest } from '../../../modules/orders/return.model.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';

export async function createOrder(req, res) {
  const order = await svcCreateFromCart(req.user.sub, req.validated.body);
  res.status(201).json({ order });
}

export async function listOrders(req, res) {
  const { limit, page } = req.query;
  const result = await svcList(req.user.sub, { limit, page });
  res.json(result);
}

export async function getOrder(req, res) {
  const order = await svcGet(req.user.sub, req.params.id);
  res.json({ order });
}

export async function getInvoice(req, res) {
  const order = await svcGet(req.user.sub, req.params.id);
  if (!order.invoiceUrl) return res.status(404).json({ error: { message: 'Invoice not available' } });
  res.redirect(order.invoiceUrl);
}

export async function getTimeline(req, res) {
  const order = await svcGet(req.user.sub, req.params.id);
  const { page, limit } = req.query;
  const result = await svcListTimeline(order._id, { page, limit });
  res.json(result);
}

export async function requestReturn(req, res, next) {
  const order = await svcGet(req.user.sub, req.params.id);
  if (order.paymentStatus !== 'paid') return next(errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Order is not paid' }));
  const existing = await ReturnRequest.findOne({ order: order._id, user: req.user.sub, status: { $in: ['requested', 'approved'] } });
  if (existing) return res.json({ return: existing });
  const rr = await ReturnRequest.create({ order: order._id, user: req.user.sub, reason: String(req.body?.reason || '') });
  await addTimeline(order._id, { type: 'return_requested', message: 'Return requested', userId: req.user.sub });
  res.status(201).json({ return: rr });
}


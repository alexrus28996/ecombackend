import { addTimeline } from '../../../modules/orders/timeline.service.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';
import { Order } from '../../../modules/orders/order.model.js';

export async function createTimelineEntry(req, res) {
  const { type, message, meta } = req.validated?.body ?? req.body;
  const orderId = req.validated?.params?.id ?? req.params.id;
  const order = await Order.findById(orderId).lean();
  if (!order) throw errors.notFound(ERROR_CODES.ORDER_NOT_FOUND);
  const userId = req.user?.sub;
  await addTimeline(orderId, { type, message, meta, userId });
  res.status(201).json({ success: true });
}

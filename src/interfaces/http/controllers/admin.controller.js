import { User } from '../../../modules/users/user.model.js';
import { Product } from '../../../modules/catalog/product.model.js';
import { Order } from '../../../modules/orders/order.model.js';
import { ROLES, ORDER_STATUS, PAYMENT_STATUS } from '../../../config/constants.js';
import { config } from '../../../config/index.js';
import { Coupon } from '../../../modules/coupons/coupon.model.js';
import { createCoupon, listCoupons, getCoupon, updateCoupon, deleteCoupon } from '../../../modules/coupons/coupon.service.js';
import { adjustStock, listAdjustments, listInventory } from '../../../modules/inventory/inventory.service.js';
import slugify from 'slugify';
import { ReturnRequest } from '../../../modules/orders/return.model.js';
import { refundPaymentIntent } from '../../../modules/payments/stripe.service.js';
import { addTimeline } from '../../../modules/orders/timeline.service.js';

export async function listUsers(req, res) {
  const { q } = req.query;
  const limitRaw = req.query.limit ?? 20;
  const pageRaw = req.query.page ?? 1;
  const limit = Math.max(1, Math.min(Number(limitRaw) || 20, 100));
  const page = Math.max(Number(pageRaw) || 1, 1);
  const skip = (page - 1) * limit;
  const filter = {};
  if (q) {
    const rx = new RegExp(String(q), 'i');
    filter.$or = [{ email: rx }, { name: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);
  const data = items.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, roles: u.roles, isActive: u.isActive }));
  res.json({ items: data, total, page, pages: Math.ceil(total / limit || 1) });
}

export async function getUserById(req, res) {
  const { id } = req.validated.params;
  const u = await User.findById(id);
  if (!u) return res.status(404).json({ error: { message: 'User not found' } });
  res.json({ user: { id: u._id.toString(), name: u.name, email: u.email, roles: u.roles, isActive: u.isActive } });
}

export async function updateUser(req, res) {
  const { id } = req.validated.params;
  const { isActive } = req.validated.body;
  const u = await User.findById(id);
  if (!u) return res.status(404).json({ error: { message: 'User not found' } });
  if (typeof isActive === 'boolean') u.isActive = isActive;
  await u.save();
  res.json({ user: { id: u._id.toString(), name: u.name, email: u.email, roles: u.roles, isActive: u.isActive } });
}

export async function promoteUser(req, res) {
  const { id } = req.validated.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  if (!Array.isArray(user.roles)) user.roles = [];
  if (!user.roles.includes(ROLES.ADMIN)) user.roles.push(ROLES.ADMIN);
  await user.save();
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles } });
}

export async function demoteUser(req, res) {
  const { id } = req.validated.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  user.roles = (user.roles || []).filter((r) => r !== ROLES.ADMIN);
  if (user.roles.length === 0) user.roles = [ROLES.CUSTOMER];
  await user.save();
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles } });
}

export async function metrics(req, res) {
  const [usersTotal, usersActive, adminsCount, productsCount, ordersTotal] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ roles: ROLES.ADMIN }),
    Product.countDocuments({}),
    Order.countDocuments({})
  ]);

  const ordersByStatusAgg = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const ordersByStatus = Object.fromEntries(ordersByStatusAgg.map((x) => [x._id, x.count]));

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const revenueAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ usersTotal, usersActive, adminsCount, productsCount, ordersTotal, ordersByStatus, revenueLast7Days: revenueAgg });
}

export async function listOrders(req, res) {
  const { status, paymentStatus, user, from, to } = req.query;
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (user) filter.user = user;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit || 1) });
}

export async function getOrder(req, res) {
  const ord = await Order.findById(req.validated.params.id);
  if (!ord) return res.status(404).json({ error: { message: 'Order not found' } });
  res.json({ order: ord });
}

export async function updateOrder(req, res) {
  const { id } = req.validated.params;
  const ord = await Order.findById(id);
  if (!ord) return res.status(404).json({ error: { message: 'Order not found' } });
  const { status, paymentStatus } = req.validated.body;
  if (status && status !== ord.status) {
    await addTimeline(ord._id, { type: 'status_updated', message: `Status: ${ord.status} -> ${status}`, userId: req.user.sub, from: ord.status, to: status });
    ord.status = status;
  }
  if (paymentStatus && paymentStatus !== ord.paymentStatus) {
    await addTimeline(ord._id, { type: 'payment_updated', message: `Payment: ${ord.paymentStatus} -> ${paymentStatus}`, userId: req.user.sub, from: ord.paymentStatus, to: paymentStatus });
    ord.paymentStatus = paymentStatus;
  }
  await ord.save();
  res.json({ order: ord });
}

export async function listCouponsController(req, res) {
  const { q, page, limit } = req.query;
  const result = await listCoupons({ q, page, limit });
  res.json(result);
}

export async function createCouponController(req, res) {
  const coupon = await createCoupon(req.validated.body);
  res.status(201).json({ coupon });
}

export async function getCouponController(req, res) {
  const c = await getCoupon(req.validated.params.id);
  if (!c) return res.status(404).json({ error: { message: 'Coupon not found' } });
  res.json({ coupon: c });
}

export async function updateCouponController(req, res) {
  const c = await updateCoupon(req.validated.params.id, req.validated.body);
  if (!c) return res.status(404).json({ error: { message: 'Coupon not found' } });
  res.json({ coupon: c });
}

export async function deleteCouponController(req, res) {
  const result = await deleteCoupon(req.validated.params.id);
  res.json(result);
}

export async function listAdjustmentsController(req, res) {
  const { product, variant, reason, page, limit } = req.query;
  const result = await listAdjustments({ product, variant, reason, page, limit });
  res.json(result);
}

export async function createAdjustmentController(req, res) {
  const { productId, variantId, qtyChange, reason, note, location } = req.validated.body;
  const { adjustment, product, inventory } = await adjustStock({ productId, variantId, qtyChange, reason, note, byUserId: req.user.sub, location: typeof location === 'string' ? location : null });
  res.status(201).json({ adjustment, product, inventory });
}

export async function listInventoryController(req, res) {
  const { product, variant, location, page, limit } = req.query;
  const result = await listInventory({ product, variant, location, page, limit });
  res.json(result);
}

export async function listReturnsController(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 20);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    ReturnRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    ReturnRequest.countDocuments(filter)
  ]);
  res.json({ items, total, page: p, pages: Math.ceil(total / l || 1) });
}

export async function approveReturnController(req, res) {
  const rr = await ReturnRequest.findById(req.params.id);
  if (!rr) return res.status(404).json({ error: { message: 'Return request not found' } });
  if (rr.status !== 'requested') return res.status(400).json({ error: { message: 'Return already processed' } });
  const order = await Order.findById(rr.order);
  if (!order) return res.status(404).json({ error: { message: 'Order not found' } });
  if (order.paymentProvider === 'stripe' && order.transactionId) {
    try { await refundPaymentIntent(order.transactionId); } catch (e) { /* swallow for now */ }
  }
  for (const it of order.items) {
    await adjustStock({ productId: it.product, variantId: it.variant || null, qtyChange: Math.abs(it.quantity), reason: 'refund', note: `Return ${rr._id}`, byUserId: req.user.sub });
  }
  order.paymentStatus = 'refunded';
  order.status = 'refunded';
  await order.save();
  rr.status = 'refunded';
  rr.refundedAt = new Date();
  rr.approvedBy = req.user.sub;
  rr.approvedAt = new Date();
  await rr.save();
  await addTimeline(order._id, { type: 'return_approved', message: 'Return approved and refunded', userId: req.user.sub });
  res.json({ return: rr, order });
}

export async function rejectReturnController(req, res) {
  const rr = await ReturnRequest.findById(req.params.id);
  if (!rr) return res.status(404).json({ error: { message: 'Return request not found' } });
  if (rr.status !== 'requested') return res.status(400).json({ error: { message: 'Return already processed' } });
  rr.status = 'rejected';
  rr.rejectedAt = new Date();
  rr.approvedBy = req.user.sub;
  await rr.save();
  await addTimeline(rr.order, { type: 'return_rejected', message: 'Return rejected', userId: req.user.sub });
  res.json({ return: rr });
}

export async function importProductsController(req, res) {
  const items = req.validated.body.items.map((it) => ({
    ...it,
    currency: it.currency || 'USD',
    slug: it.slug || slugify(it.name, { lower: true, strict: true })
  }));
  const results = { inserted: 0, failed: 0, errors: [] };
  for (const it of items) {
    try {
      await Product.create(it);
      results.inserted++;
    } catch (e) {
      results.failed++;
      results.errors.push({ name: it.name, message: e.message });
    }
  }
  res.status(201).json(results);
}

export async function exportProductsController(req, res) {
  const format = (req.query.format || 'json').toString().toLowerCase();
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  if (format === 'csv') {
    const headers = ['name','slug','description','price','currency','stock','isActive','category','images','attributes','variants'];
    const lines = [headers.join(',')];
    for (const p of products) {
      const row = [
        p.name,
        p.slug || '',
        (p.description || '').replace(/\n|\r|,/g, ' '),
        String(p.price ?? ''),
        p.currency || '',
        String(p.stock ?? ''),
        String(p.isActive ?? ''),
        p.category ? String(p.category) : '',
        JSON.stringify(p.images || []),
        JSON.stringify(Object.fromEntries(p.attributes || [])),
        JSON.stringify(p.variants || [])
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(','));
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    return res.send(csv);
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="products.json"');
  res.send(JSON.stringify(products));
}

export async function salesReportController(req, res) {
  const { from, to, groupBy = 'day' } = req.query;
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  const format = groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%G-%V' : '%Y-%m-%d';
  const agg = await Order.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ groupBy, series: agg.map(x => ({ period: x._id, revenue: x.revenue, orders: x.orders })) });
}

export async function topProductsReportController(req, res) {
  const { from, to, by = 'quantity', limit = 10 } = req.query;
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  const project = { _id: 0, items: 1 };
  const agg = await Order.aggregate([
    { $match: match },
    { $project: project },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
    { $sort: by === 'revenue' ? { revenue: -1 } : { quantity: -1 } },
    { $limit: Math.max(1, Math.min(Number(limit) || 10, 50)) }
  ]);
  res.json({ by, items: agg.map(x => ({ product: x._id, name: x.name, quantity: x.quantity, revenue: x.revenue })) });
}

export async function topCustomersReportController(req, res) {
  const { from, to, by = 'revenue', limit = 10 } = req.query;
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  const agg = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$user', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    { $sort: by === 'orders' ? { orders: -1 } : { revenue: -1 } },
    { $limit: Math.max(1, Math.min(Number(limit) || 10, 50)) }
  ]);
  res.json({ by, items: agg.map(x => ({ user: x._id, orders: x.orders, revenue: x.revenue })) });
}

export async function lowStockController(req, res) {
  const threshold = Number(req.query.threshold ?? config.LOW_STOCK_THRESHOLD) || config.LOW_STOCK_THRESHOLD;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 200));
  const skip = (page - 1) * limit;
  const { Inventory } = await import('../../../modules/inventory/inventory.model.js');
  const [items, total] = await Promise.all([
    Inventory.find({ qty: { $lte: threshold } }).sort({ qty: 1 }).skip(skip).limit(limit),
    Inventory.countDocuments({ qty: { $lte: threshold } })
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit || 1), threshold });
}

export async function priceBulkController(req, res) {
  const { factorPercent, filter } = req.validated.body;
  const q = filter?.q;
  const category = filter?.category;
  const dbFilter = {};
  if (q) dbFilter.$or = [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }];
  if (category) dbFilter.category = category;
  const factor = 1 + (Number(factorPercent) / 100);
  const result = await Product.updateMany(dbFilter, { $mul: { price: factor } });
  res.json({ matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified, factor });
}

export async function categoryBulkController(req, res) {
  const { categoryId, productIds } = req.validated.body;
  const result = await Product.updateMany({ _id: { $in: productIds } }, { $set: { category: categoryId } });
  res.json({ matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified });
}


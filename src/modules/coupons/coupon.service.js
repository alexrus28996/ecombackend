import { Coupon } from './coupon.model.js';
import { Product } from '../catalog/product.model.js';
import { Order } from '../orders/order.model.js';

export async function createCoupon(data) {
  data.code = String(data.code).trim().toUpperCase();
  const exists = await Coupon.findOne({ code: data.code });
  if (exists) return exists;
  return Coupon.create(data);
}

export async function listCoupons({ q, limit = 50, page = 1 } = {}) {
  const filter = {};
  if (q) {
    const rx = new RegExp(String(q), 'i');
    filter.$or = [{ code: rx }, { description: rx }];
  }
  const l = Math.max(1, Number(limit) || 50);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    Coupon.countDocuments(filter)
  ]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}

export async function getCoupon(id) {
  return Coupon.findById(id);
}

export async function updateCoupon(id, data) {
  if (data.code) data.code = String(data.code).trim().toUpperCase();
  return Coupon.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteCoupon(id) {
  await Coupon.findByIdAndDelete(id);
  return { success: true };
}

export async function findValidCouponByCode(code, { subtotal, userId, productIds } = {}) {
  const c = await Coupon.findOne({ code: String(code).trim().toUpperCase(), isActive: true });
  if (!c) return null;
  if (c.expiresAt && Date.now() >= new Date(c.expiresAt).getTime()) return null;
  if (subtotal < (c.minSubtotal || 0)) return null;
  // Usage limits
  if (c.globalLimit && c.globalLimit > 0) {
    const used = await Order.countDocuments({ couponCode: c.code });
    if (used >= c.globalLimit) return null;
  }
  if (c.perUserLimit && c.perUserLimit > 0 && userId) {
    const used = await Order.countDocuments({ couponCode: c.code, user: userId });
    if (used >= c.perUserLimit) return null;
  }
  // Targeting rules
  if ((c.includeCategories?.length || c.excludeCategories?.length || c.includeProducts?.length || c.excludeProducts?.length) && Array.isArray(productIds) && productIds.length) {
    const prods = await Product.find({ _id: { $in: productIds } }, { _id: 1, category: 1 }).lean();
    const prodSet = new Set(prods.map(p => String(p._id)));
    const catSet = new Set(prods.filter(p => p.category).map(p => String(p.category)));
    if (c.includeProducts?.length) {
      const inc = c.includeProducts.map(String);
      if (!inc.some(id => prodSet.has(id))) return null;
    }
    if (c.excludeProducts?.length) {
      const exc = c.excludeProducts.map(String);
      if (exc.some(id => prodSet.has(id))) return null;
    }
    if (c.includeCategories?.length) {
      const inc = c.includeCategories.map(String);
      if (!inc.some(id => catSet.has(id))) return null;
    }
    if (c.excludeCategories?.length) {
      const exc = c.excludeCategories.map(String);
      if (exc.some(id => catSet.has(id))) return null;
    }
  }
  return c;
}

export function computeDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.type === 'percent') return Math.max(0, Math.round(subtotal * (Number(coupon.value) / 100) * 100) / 100);
  return Math.max(0, Math.min(subtotal, Number(coupon.value)));
}

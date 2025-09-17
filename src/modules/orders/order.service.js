import mongoose from 'mongoose';
import { Cart } from '../cart/cart.model.js';
import { Product } from '../catalog/product.model.js';
import { Order } from './order.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { CART_STATUS } from '../../config/constants.js';
import { adjustStock, getAvailableStock } from '../inventory/inventory.service.js';
import { generateInvoicePdf } from './invoice.service.js';
import { deliverEmail } from '../../utils/mailer.js';
import { Reservation } from '../inventory/reservation.model.js';
import { calcShipping, calcTax } from '../checkout/pricing.service.js';
import { addTimeline } from './timeline.service.js';
import { Address } from '../users/address.model.js';

/**
 * Create an order from the user's active cart with stock checks.
 * Uses a transaction if available (replica set).
 * @param {string} userId
 * @param {{ shippingAddress?: object, shipping?: number, taxRate?: number }} payload
 */
export async function createOrderFromCart(userId, { shippingAddress, billingAddress, shipping, taxRate }) {
  const cart = await Cart.findOne({ user: userId, status: CART_STATUS.ACTIVE });
  if (!cart || cart.items.length === 0) throw errors.badRequest(ERROR_CODES.CART_EMPTY);

  const runWorkflow = async (sess) => {
    // Resolve addresses from defaults if not provided
    let resolvedShipping = shippingAddress;
    let resolvedBilling = billingAddress;
    if (!resolvedShipping) {
      const defShip = await Address.findOne({ user: userId, type: 'shipping', isDefault: true }).lean();
      if (defShip) {
        const { fullName, line1, line2, city, state, postalCode, country, phone } = defShip;
        resolvedShipping = { fullName, line1, line2, city, state, postalCode, country, phone };
      }
    }
    if (!resolvedBilling) {
      const defBill = await Address.findOne({ user: userId, type: 'billing', isDefault: true }).lean();
      if (defBill) {
        const { fullName, line1, line2, city, state, postalCode, country, phone } = defBill;
        resolvedBilling = { fullName, line1, line2, city, state, postalCode, country, phone };
      } else if (resolvedShipping) {
        resolvedBilling = { ...resolvedShipping };
      }
    }
    // Check stock and build items snapshot (variant-aware) using cart pricing
    const items = [];
    for (const it of cart.items) {
      const q = Product.findById(it.product);
      const product = sess ? await q.session(sess) : await q;
      if (!product || !product.isActive) throw errors.badRequest(ERROR_CODES.PRODUCT_UNAVAILABLE, { name: it.name });
      const available = await getAvailableStock(product._id, it.variant || null);
      if (available < it.quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, { name: it.name });
      await adjustStock({ productId: product._id, variantId: it.variant || null, qtyChange: -Math.abs(it.quantity), reason: 'order', note: `Order`, byUserId: userId, session: sess || null });
      items.push({ product: product._id, variant: it.variant || undefined, name: it.name || product.name, price: it.price, currency: cart.currency, quantity: it.quantity });
    }

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    // Carry coupon discount from cart if present and applicable on current subtotal
    let discount = 0;
    if (cart.coupon && cart.couponCode) {
      discount = Math.min(subtotal, Number(cart.discount || 0));
    }
    const shippingAmount = typeof shipping === 'number' ? Number(shipping) : calcShipping({ subtotal });
    const tax = calcTax({ subtotal, taxRate });
    const total = Math.max(0, subtotal - discount) + shippingAmount + Number(tax);

    let orderDocs = await Order.create([
      {
        user: userId,
        items,
        subtotal,
        discount,
        couponCode: cart.couponCode || undefined,
        shipping: shippingAmount,
        tax,
        taxRate: typeof taxRate === 'number' ? taxRate : undefined,
        total,
        currency: cart.currency,
        shippingAddress: resolvedShipping,
        billingAddress: resolvedBilling
      }
    ], { session: sess || undefined });

    cart.status = CART_STATUS.CONVERTED;
    cart.items = [];
    cart.subtotal = 0;
    await cart.save({ session: sess || undefined });

    // Generate invoice
    const created = orderDocs[0];
    await addTimeline(created._id, { type: 'created', message: 'Order created', userId });
    const { invoiceNumber, invoiceUrl } = await generateInvoicePdf(created);
    created.invoiceNumber = invoiceNumber;
    created.invoiceUrl = invoiceUrl;
    await created.save({ session: sess || undefined });
    await addTimeline(created._id, { type: 'invoice_generated', message: `Invoice ${invoiceNumber} generated` });
    // Record reservations for audit/ops (reserved until paid or released on cancel)
    try {
      const resDocs = items.map((it) => ({ order: created._id, user: userId, product: it.product, variant: it.variant || null, quantity: it.quantity, status: 'reserved', reason: 'order' }));
      await Reservation.insertMany(resDocs, { session: sess || undefined });
    } catch {}
    return created;
  };

  const session = await mongoose.startSession();
  let created;
  try {
    try {
      await session.withTransaction(async () => {
        created = await runWorkflow(session);
      });
    } catch (e) {
      const msg = String(e && e.message || '');
      if (msg.includes('Transaction numbers are only allowed') || e?.codeName === 'IllegalOperation') {
        // Fallback: run without a transaction on standalone MongoDB
        created = await runWorkflow(null);
      } else {
        throw e;
      }
    }
  } finally {
    try { await session.endSession(); } catch {}
  }

  // Notify (dev logs)
  try { await deliverEmail({ to: created.user?.email || 'customer@example.com', subject: `Invoice ${created.invoiceNumber}`, text: `Your invoice: ${created.invoiceUrl}` }); } catch {}
  return created;
}

/**
 * List orders for a user with pagination.
 */
export async function listOrders(userId, { limit = 20, page = 1 }) {
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments({ user: userId })
  ]);
  return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit) || 1) };
}

/**
 * Get a single order by id for the user.
 */
export async function getOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw errors.notFound(ERROR_CODES.ORDER_NOT_FOUND);
  return order;
}

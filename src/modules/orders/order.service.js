import mongoose from 'mongoose';
import { Cart } from '../cart/cart.model.js';
import { Product } from '../catalog/product.model.js';
import { Order } from './order.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { CART_STATUS, PAYMENT_METHOD } from '../../config/constants.js';
import { getAvailableStock } from '../inventory/services/stock.service.js';
import { generateInvoicePdf } from './invoice.service.js';
import { deliverEmail } from '../../utils/mailer.js';
import { reserveOrderItems } from '../inventory/reservation.service.js';
import { calcShipping, calcTax } from '../checkout/pricing.service.js';
import { addTimeline } from './timeline.service.js';
import { t } from '../../i18n/index.js';
import { Address } from '../users/address.model.js';
import { config } from '../../config/index.js';
import { getLogger } from '../../logger.js';

const logger = getLogger().child({ module: 'orders-service' });

/**
 * Create an order from the user's active cart with stock checks.
 * Uses a transaction if available (replica set).
 * @param {string} userId
 * @param {{ shippingAddress?: object, billingAddress?: object, shipping?: number, taxRate?: number, paymentMethod?: string }} payload
 */
export async function createOrderFromCart(userId, { shippingAddress, billingAddress, shipping, taxRate, paymentMethod } = {}) {
  const cart = await Cart.findOne({ user: userId, status: CART_STATUS.ACTIVE });
  if (!cart || cart.items.length === 0) throw errors.badRequest(ERROR_CODES.CART_EMPTY);

  const method = paymentMethod === PAYMENT_METHOD.COD ? PAYMENT_METHOD.COD : PAYMENT_METHOD.PREPAID;

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
    const reservationItems = [];
    for (const it of cart.items) {
      const q = Product.findById(it.product);
      const product = sess ? await q.session(sess) : await q;
      if (!product || !product.isActive) {
        const errorDetails = { productId: String(it.product) };
        if (it.variant) errorDetails.variantId = String(it.variant);
        throw errors.badRequest(
          ERROR_CODES.PRODUCT_UNAVAILABLE,
          { name: product?.name || it.name },
          errorDetails
        );
      }
      const shouldCheckStock = product.requiresShipping !== false;
      if (shouldCheckStock) {
        const available = await getAvailableStock(product._id, it.variant || null);
        if (available < it.quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, { name: it.name });
      }
      items.push({ product: product._id, variant: it.variant || undefined, name: it.name || product.name, price: it.price, currency: cart.currency, quantity: it.quantity });
      if (shouldCheckStock) {
        reservationItems.push({ productId: product._id, variantId: it.variant || null, quantity: it.quantity });
      }
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
        paymentMethod: method,
        paymentProvider: method === PAYMENT_METHOD.COD ? 'cod' : undefined,
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
    await addTimeline(created._id, { type: 'created', message: t('timeline.order_created'), userId });
    if (method === PAYMENT_METHOD.COD) {
      await addTimeline(created._id, { type: 'payment_method_selected', message: t('timeline.payment_method_cod'), userId });
    }
    const { invoiceNumber, invoiceUrl } = await generateInvoicePdf(created);
    created.invoiceNumber = invoiceNumber;
    created.invoiceUrl = invoiceUrl;
    await created.save({ session: sess || undefined });
    await addTimeline(created._id, { type: 'invoice_generated', message: t('timeline.invoice_generated', { invoiceNumber }) });
    // Record reservations for audit/ops (reserved until paid or released on cancel)
    const shipToGeo = resolvedShipping?.postalCode || resolvedShipping?.country ? {
      pincode: resolvedShipping?.postalCode,
      country: resolvedShipping?.country,
      lat: resolvedShipping?.lat,
      lng: resolvedShipping?.lng
    } : undefined;
    await reserveOrderItems({
      orderId: created._id,
      userId,
      items: reservationItems,
      session: sess || undefined,
      expiresInMinutes: config.RESERVATION_EXPIRES_MINUTES,
      notes: 'order placement',
      shipTo: shipToGeo
    });
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
    try { await session.endSession(); } catch (err) {
      logger.warn({ err }, 'failed to end order creation session');
    }
  }

  // Notify (dev logs)
  try {
    await deliverEmail({ to: created.user?.email || 'customer@example.com', subject: t('email.invoice_subject', { invoiceNumber: created.invoiceNumber }), text: t('email.invoice_body', { invoiceUrl: created.invoiceUrl }) });
  } catch (err) {
    logger.warn({ err, orderId: String(created?._id) }, 'failed to send order confirmation email');
  }
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

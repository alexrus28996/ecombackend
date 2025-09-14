import mongoose from 'mongoose';
import { Cart } from '../cart/cart.model.js';
import { Product } from '../catalog/product.model.js';
import { Order } from './order.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { CART_STATUS } from '../../config/constants.js';
import { adjustStock, getAvailableStock } from '../inventory/inventory.service.js';
import { generateInvoicePdf } from './invoice.service.js';
import { deliverEmail } from '../../utils/mailer.js';
import { calcShipping, calcTax } from '../checkout/pricing.service.js';
import { addTimeline } from './timeline.service.js';

/**
 * Create an order from the user's active cart with stock checks.
 * Uses a transaction if available (replica set).
 * @param {string} userId
 * @param {{ shippingAddress?: object, shipping?: number, taxRate?: number }} payload
 */
export async function createOrderFromCart(userId, { shippingAddress, shipping, taxRate }) {
  const cart = await Cart.findOne({ user: userId, status: CART_STATUS.ACTIVE });
  if (!cart || cart.items.length === 0) throw errors.badRequest(ERROR_CODES.CART_EMPTY);

  const session = await mongoose.startSession();
  try {
    let useTxn = false;
    try {
      session.startTransaction();
      useTxn = true;
    } catch { /* replica set not enabled */ }

    // Check stock and build items snapshot (variant-aware) using cart pricing
    const items = [];
    for (const it of cart.items) {
      const product = await Product.findById(it.product).session(useTxn ? session : null);
      if (!product || !product.isActive) throw errors.badRequest(ERROR_CODES.PRODUCT_UNAVAILABLE, { name: it.name });
      const available = await getAvailableStock(product._id, it.variant || null);
      if (available < it.quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, { name: it.name });
      await adjustStock({ productId: product._id, variantId: it.variant || null, qtyChange: -Math.abs(it.quantity), reason: 'order', note: `Order`, byUserId: userId });
      items.push({ product: product._id, name: it.name || product.name, price: it.price, currency: cart.currency, quantity: it.quantity });
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

    let order = await Order.create([
      {
        user: userId,
        items,
        subtotal,
        discount,
        shipping: shippingAmount,
        tax,
        total,
        currency: cart.currency,
        shippingAddress
      }
    ], { session: useTxn ? session : null });

    cart.status = CART_STATUS.CONVERTED;
    cart.items = [];
    cart.subtotal = 0;
    await cart.save({ session: useTxn ? session : null });

    // Generate invoice
    const created = order[0];
    await addTimeline(created._id, { type: 'created', message: 'Order created', userId });
    const { invoiceNumber, invoiceUrl } = await generateInvoicePdf(created);
    created.invoiceNumber = invoiceNumber;
    created.invoiceUrl = invoiceUrl;
    await created.save({ session: useTxn ? session : null });
    await addTimeline(created._id, { type: 'invoice_generated', message: `Invoice ${invoiceNumber} generated` });

    if (useTxn) await session.commitTransaction();
    await session.endSession();

    // Notify (dev logs)
    try { await deliverEmail({ to: created.user?.email || 'customer@example.com', subject: `Invoice ${invoiceNumber}`, text: `Your invoice: ${invoiceUrl}` }); } catch {}
    return created;
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    try { await session.endSession(); } catch {}
    throw err;
  }
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

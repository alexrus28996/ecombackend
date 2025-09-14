import mongoose from 'mongoose';
import { Cart } from '../cart/cart.model.js';
import { Product } from '../catalog/product.model.js';
import { Order } from './order.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { CART_STATUS } from '../../config/constants.js';

/**
 * Create an order from the user's active cart with stock checks.
 * Uses a transaction if available (replica set).
 * @param {string} userId
 * @param {{ shippingAddress?: object, shipping?: number, taxRate?: number }} payload
 */
export async function createOrderFromCart(userId, { shippingAddress, shipping = 0, taxRate = 0 }) {
  const cart = await Cart.findOne({ user: userId, status: CART_STATUS.ACTIVE });
  if (!cart || cart.items.length === 0) throw errors.badRequest(ERROR_CODES.CART_EMPTY);

  const session = await mongoose.startSession();
  try {
    let useTxn = false;
    try {
      session.startTransaction();
      useTxn = true;
    } catch { /* replica set not enabled */ }

    // Check stock and build items snapshot
    const items = [];
    for (const it of cart.items) {
      const product = await Product.findById(it.product).session(useTxn ? session : null);
      if (!product || !product.isActive) throw errors.badRequest(ERROR_CODES.PRODUCT_UNAVAILABLE, { name: it.name });
      if (product.stock < it.quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK, { name: it.name });
      product.stock -= it.quantity;
      await product.save({ session: useTxn ? session : null });
      items.push({ product: product._id, name: product.name, price: product.price, currency: product.currency, quantity: it.quantity });
    }

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const tax = Math.round(subtotal * Number(taxRate) * 100) / 100;
    const total = subtotal + Number(shipping) + Number(tax);

    const order = await Order.create([
      {
        user: userId,
        items,
        subtotal,
        shipping: Number(shipping) || 0,
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

    if (useTxn) await session.commitTransaction();
    await session.endSession();
    return order[0];
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

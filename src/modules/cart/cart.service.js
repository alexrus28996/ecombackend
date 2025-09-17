import { Cart } from './cart.model.js';
import { Product } from '../catalog/product.model.js';
import { getAvailableStock } from '../inventory/inventory.service.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { CART_STATUS } from '../../config/constants.js';
import { findValidCouponByCode, computeDiscount } from '../coupons/coupon.service.js';

/**
 * Find an active cart for a user or create a new one.
 * @param {string} userId
 */
export async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId, status: CART_STATUS.ACTIVE });
  if (!cart) cart = await Cart.create({ user: userId });
  return cart;
}

/**
 * Return the user's active cart (creates one if missing).
 */
export async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  return cart;
}

/**
 * Add an item to the user's cart (or increase quantity).
 * @param {string} userId
 * @param {{ productId: string, quantity?: number }} payload
 */
export async function addItem(userId, { productId, variantId, quantity = 1 }) {
  const product = await Product.findById(productId);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  if (!product.isActive) throw errors.notFound(ERROR_CODES.PRODUCT_UNAVAILABLE, { name: product.name });
  let unitPrice = product.price;
  let currency = product.currency;
  let variantMeta = {};
  if (variantId) {
    const variant = product.variants?.find(v => v._id.toString() === String(variantId));
    if (!variant || !variant.isActive) throw errors.badRequest(ERROR_CODES.PRODUCT_UNAVAILABLE, { name: product.name });
    const available = await getAvailableStock(product._id, variantId);
    if (available < quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);
    unitPrice = typeof variant.price === 'number' ? variant.price : Number(product.price) + Number(variant.priceDelta || 0);
    variantMeta = { variant: variant._id, sku: variant.sku, attributes: variant.attributes };
  } else {
    const available = await getAvailableStock(product._id, null);
    if (available < quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);
  }

  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((it) => it.product.toString() === productId && String(it.variant || '') === String(variantMeta.variant || ''));
  if (idx >= 0) {
    cart.items[idx].quantity += quantity;
  } else {
    cart.items.push({
      product: product._id,
      variant: variantMeta.variant,
      sku: variantMeta.sku,
      attributes: variantMeta.attributes,
      name: product.name,
      price: unitPrice,
      currency,
      quantity
    });
  }
  cart.currency = currency;
  cart.recalculate();
  // apply existing coupon if present
  if (cart.couponCode) {
    const productIds = cart.items.map(i => i.product);
    const coupon = await findValidCouponByCode(cart.couponCode, { subtotal: cart.subtotal, userId, productIds });
    if (coupon) {
      cart.coupon = coupon._id;
      cart.discount = computeDiscount(coupon, cart.subtotal);
    } else {
      cart.coupon = undefined;
      cart.couponCode = undefined;
      cart.discount = 0;
    }
  } else {
    cart.discount = 0;
  }
  cart.total = Math.max(0, cart.subtotal - (cart.discount || 0));
  await cart.save();
  return cart;
}

/**
 * Set the quantity of an item in the cart.
 * @param {string} userId
 * @param {{ productId: string, quantity: number }} payload
 */
export async function updateItem(userId, { productId, variantId, quantity }) {
  if (quantity <= 0) throw errors.badRequest(ERROR_CODES.QUANTITY_POSITIVE);
  const product = await Product.findById(productId);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  const available = await getAvailableStock(productId, variantId);
  if (available < quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);

  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((it) => it.product.toString() === productId && String(it.variant || '') === String(variantId || ''));
  if (idx < 0) throw errors.notFound(ERROR_CODES.ITEM_NOT_IN_CART);
  cart.items[idx].quantity = quantity;
  cart.recalculate();
  if (cart.couponCode) {
    const productIds = cart.items.map(i => i.product);
    const coupon = await findValidCouponByCode(cart.couponCode, { subtotal: cart.subtotal, userId, productIds });
    if (coupon) {
      cart.coupon = coupon._id;
      cart.discount = computeDiscount(coupon, cart.subtotal);
    } else {
      cart.coupon = undefined;
      cart.couponCode = undefined;
      cart.discount = 0;
    }
  } else {
    cart.discount = 0;
  }
  cart.total = Math.max(0, cart.subtotal - (cart.discount || 0));
  await cart.save();
  return cart;
}

/**
 * Remove an item from the cart.
 */
export async function removeItem(userId, { productId, variantId }) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((it) => !(it.product.toString() === productId && String(it.variant || '') === String(variantId || '')));
  cart.recalculate();
  if (cart.couponCode) {
    const productIds = cart.items.map(i => i.product);
    const coupon = await findValidCouponByCode(cart.couponCode, { subtotal: cart.subtotal, userId, productIds });
    if (coupon) {
      cart.coupon = coupon._id;
      cart.discount = computeDiscount(coupon, cart.subtotal);
    } else {
      cart.coupon = undefined;
      cart.couponCode = undefined;
      cart.discount = 0;
    }
  } else {
    cart.discount = 0;
  }
  cart.total = Math.max(0, cart.subtotal - (cart.discount || 0));
  await cart.save();
  return cart;
}

/**
 * Apply a coupon code to the user's cart.
 */
export async function applyCoupon(userId, code) {
  const cart = await getOrCreateCart(userId);
  cart.recalculate();
  const productIds = cart.items.map(i => i.product);
  const coupon = await findValidCouponByCode(code, { subtotal: cart.subtotal, userId, productIds });
  if (!coupon) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { field: 'coupon', message: 'Invalid or inapplicable coupon' });
  cart.couponCode = coupon.code;
  cart.coupon = coupon._id;
  cart.discount = computeDiscount(coupon, cart.subtotal);
  cart.total = Math.max(0, cart.subtotal - (cart.discount || 0));
  await cart.save();
  return cart;
}

/**
 * Remove any coupon applied to the cart.
 */
export async function removeCoupon(userId) {
  const cart = await getOrCreateCart(userId);
  cart.coupon = undefined;
  cart.couponCode = undefined;
  cart.discount = 0;
  cart.total = cart.subtotal;
  await cart.save();
  return cart;
}

/**
 * Remove all items from the cart.
 */
export async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  cart.recalculate();
  await cart.save();
  return cart;
}

import { Cart } from './cart.model.js';
import { Product } from '../catalog/product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { CART_STATUS } from '../../config/constants.js';

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
export async function addItem(userId, { productId, quantity = 1 }) {
  const product = await Product.findById(productId);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  if (!product.isActive) throw errors.notFound(ERROR_CODES.PRODUCT_UNAVAILABLE, { name: product.name });
  if (product.stock < quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);

  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((it) => it.product.toString() === productId);
  if (idx >= 0) {
    cart.items[idx].quantity += quantity;
  } else {
    cart.items.push({
      product: product._id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      quantity
    });
  }
  cart.currency = product.currency;
  cart.recalculate();
  await cart.save();
  return cart;
}

/**
 * Set the quantity of an item in the cart.
 * @param {string} userId
 * @param {{ productId: string, quantity: number }} payload
 */
export async function updateItem(userId, { productId, quantity }) {
  if (quantity <= 0) throw errors.badRequest(ERROR_CODES.QUANTITY_POSITIVE);
  const product = await Product.findById(productId);
  if (!product) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  if (product.stock < quantity) throw errors.badRequest(ERROR_CODES.INSUFFICIENT_STOCK);

  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((it) => it.product.toString() === productId);
  if (idx < 0) throw errors.notFound(ERROR_CODES.ITEM_NOT_IN_CART);
  cart.items[idx].quantity = quantity;
  cart.recalculate();
  await cart.save();
  return cart;
}

/**
 * Remove an item from the cart.
 */
export async function removeItem(userId, { productId }) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((it) => it.product.toString() !== productId);
  cart.recalculate();
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

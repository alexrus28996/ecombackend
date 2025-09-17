import { getCart as svcGetCart, addItem as svcAdd, updateItem as svcUpdate, removeItem as svcRemove, clearCart as svcClear, applyCoupon as svcApplyCoupon, removeCoupon as svcRemoveCoupon } from '../../../modules/cart/cart.service.js';
import { calcShipping, calcTax } from '../../../modules/checkout/pricing.service.js';

export async function getCart(req, res) {
  const cart = await svcGetCart(req.user.sub);
  res.json({ cart });
}

export async function addItem(req, res) {
  const cart = await svcAdd(req.user.sub, req.validated.body);
  res.status(201).json({ cart });
}

export async function updateItem(req, res) {
  const cart = await svcUpdate(req.user.sub, { productId: req.validated.params.productId, variantId: req.validated.body.variantId, quantity: req.validated.body.quantity });
  res.json({ cart });
}

export async function removeItem(req, res) {
  const cart = await svcRemove(req.user.sub, { productId: req.params.productId, variantId: req.query.variantId });
  res.json({ cart });
}

export async function clearCart(req, res) {
  const cart = await svcClear(req.user.sub);
  res.json({ cart });
}

export async function applyCoupon(req, res) {
  const cart = await svcApplyCoupon(req.user.sub, req.validated.body.code);
  res.json({ cart });
}

export async function removeCoupon(req, res) {
  const cart = await svcRemoveCoupon(req.user.sub);
  res.json({ cart });
}

export async function estimate(req, res) {
  const cart = await svcGetCart(req.user.sub);
  const subtotal = cart.subtotal || 0;
  const discount = Math.min(subtotal, Number(cart.discount || 0));
  const shipping = typeof req.body?.shipping === 'number' ? Number(req.body.shipping) : calcShipping({ subtotal });
  const tax = calcTax({ subtotal, taxRate: typeof req.body?.taxRate === 'number' ? req.body.taxRate : undefined });
  const total = Math.max(0, subtotal - discount) + shipping + Number(tax);
  res.json({ subtotal, discount, shipping, tax, total, currency: cart.currency });
}

import { getCart as svcGetCart, addItem as svcAdd, updateItem as svcUpdate, removeItem as svcRemove, clearCart as svcClear, applyCoupon as svcApplyCoupon, removeCoupon as svcRemoveCoupon } from '../../../modules/cart/cart.service.js';

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


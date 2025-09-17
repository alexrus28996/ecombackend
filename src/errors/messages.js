import { ERROR_CODES } from './codes.js';

// Default English messages. Centralize all user-facing strings here.
export const MESSAGES = Object.freeze({
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
  [ERROR_CODES.ROUTE_NOT_FOUND]: 'Route {method} {path} not found',
  [ERROR_CODES.FORBIDDEN]: 'Forbidden',
  [ERROR_CODES.AUTH_HEADER_MISSING]: 'Authorization header missing',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid or expired token',

  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ERROR_CODES.EMAIL_IN_USE]: 'Email already in use',

  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'Product not found',
  [ERROR_CODES.PRODUCT_UNAVAILABLE]: 'Product unavailable: {name}',
  [ERROR_CODES.CATEGORY_NOT_FOUND]: 'Category not found',
  [ERROR_CODES.CATEGORY_HAS_CHILDREN]: 'Category has child categories',
  [ERROR_CODES.BRAND_HAS_PRODUCTS]: 'Brand has products',
  [ERROR_CODES.PRODUCT_HAS_INVENTORY]: 'Product has inventory records',
  [ERROR_CODES.PRODUCT_HAS_REVIEWS]: 'Product has reviews',
  [ERROR_CODES.PRODUCT_IN_ORDERS]: 'Product exists in orders',
  [ERROR_CODES.PRODUCT_IN_SHIPMENTS]: 'Product exists in shipments',

  [ERROR_CODES.CART_EMPTY]: 'Cart is empty',
  [ERROR_CODES.ITEM_NOT_IN_CART]: 'Item not in cart',
  [ERROR_CODES.QUANTITY_POSITIVE]: 'Quantity must be greater than 0',
  [ERROR_CODES.INSUFFICIENT_STOCK]: 'Insufficient stock',

  [ERROR_CODES.ORDER_NOT_FOUND]: 'Order not found'
});

/**
 * Simple template formatter replacing {placeholders} with params.
 */
export function format(template, params = {}) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

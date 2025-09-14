import { config } from '../../config/index.js';

/**
 * Calculate shipping based on subtotal with simple free-shipping threshold and flat rate.
 */
export function calcShipping({ subtotal }) {
  const freeLimit = Number(config.SHIPPING_FREE_LIMIT) || 0;
  const flat = Number(config.SHIPPING_FLAT_RATE) || 0;
  if (freeLimit > 0 && Number(subtotal) >= freeLimit) return 0;
  return flat;
}

/**
 * Calculate tax as subtotal * rate; rate falls back to TAX_DEFAULT_RATE.
 */
export function calcTax({ subtotal, taxRate }) {
  const rate = typeof taxRate === 'number' ? taxRate : Number(config.TAX_DEFAULT_RATE) || 0;
  return Math.round(Number(subtotal) * rate * 100) / 100;
}


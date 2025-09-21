/**
 * Common role names used for access control.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  OPS_ADMIN: 'ops_admin',
  SUPPORT: 'support'
});

/**
 * States of a shopping cart lifecycle.
 */
export const CART_STATUS = Object.freeze({
  ACTIVE: 'active',
  CONVERTED: 'converted'
});

/**
 * Order lifecycle status values.
 */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
});

/**
 * Payment state tracking for orders.
 */
export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded'
});

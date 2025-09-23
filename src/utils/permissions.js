export const PERMISSIONS = {
  PRODUCT_CREATE: 'product:create',
  PRODUCT_EDIT: 'product:edit',
  PRODUCT_DELETE: 'product:delete',
  INVENTORY_MANAGE: 'inventory:manage',
  ORDER_VIEW: 'order:view'
};

export const WRITE_PERMISSIONS = new Set([
  PERMISSIONS.PRODUCT_CREATE,
  PERMISSIONS.PRODUCT_EDIT,
  PERMISSIONS.PRODUCT_DELETE,
  PERMISSIONS.INVENTORY_MANAGE
]);

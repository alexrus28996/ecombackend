import { Router } from 'express';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import checkPermission from '../../../middleware/checkPermission.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
import { ROLES } from '../../../config/constants.js';
import {
  listUsers as listUsersController,
  getUserById as getUserByIdController,
  updateUser as updateUserController,
  promoteUser as promoteUserController,
  demoteUser as demoteUserController,
  getUserPermissionsController,
  replaceUserPermissionsController,
  addUserPermissionsController,
  removeUserPermissionsController,
  metrics as metricsController,
  listOrders as listOrdersController,
  getOrder as getOrderController,
  updateOrder as updateOrderController,
  listCouponsController,
  createCouponController,
  getCouponController,
  updateCouponController,
  deleteCouponController,
  listCurrencyRatesController,
  upsertCurrencyRateController,
  deleteCurrencyRateController,
  listAdjustmentsController,
  createAdjustmentController,
  listInventoryController,
  listReturnsController,
  approveReturnController,
  rejectReturnController,
  listTransactionsController,
  getTransactionController,
  listRefundsAdminController,
  getRefundAdminController,
  listShipmentsController,
  createShipmentController,
  getShipmentController,
  listOrderShipmentsController,
  importProductsController,
  exportProductsController,
  salesReportController,
  topProductsReportController,
  topCustomersReportController,
  lowStockController,
  priceBulkController,
  categoryBulkController,
  variantsMatrixController,
  productReferencesController,
  brandReferencesController
} from '../controllers/admin.controller.js';
import {
  listProducts as listProductsController,
  getProduct as getProductController,
  createProduct as createProductController,
  updateProduct as updateProductController,
  deleteProduct as deleteProductController,
  restoreProduct as restoreProductController
} from '../controllers/products.controller.js';
import { listAuditLogs as listAuditLogsController, getAuditLog as getAuditLogController } from '../controllers/audit.controller.js';
import { listPaymentEvents, getPaymentEvent } from '../controllers/payment-events.controller.js';
import { createTimelineEntry } from '../controllers/order-timeline.controller.js';
import {
  createLocationController,
  listLocationsController,
  updateLocationController,
  deleteLocationController,
  getLocationController,
  restoreLocationController
} from '../../../modules/inventory/controllers/location.controller.js';
import {
  createTransferOrderController,
  updateTransferOrderController,
  transitionTransferOrderController,
  listTransferOrdersController,
  getTransferOrderController
} from '../../../modules/inventory/controllers/transfer.controller.js';
import {
  listLedgerController,
  getLedgerEntryController
} from '../../../modules/inventory/controllers/ledger.controller.js';
import { productCreateSchema, productUpdateSchema } from '../validation/products.validation.js';
import { idParam, updateUserSchema, updateOrderSchema, couponSchema, adjustSchema, importSchema, priceBulkSchema, categoryBulkSchema, shipmentCreateSchema, variantsMatrixSchema, returnApproveSchema, currencyRateListSchema, currencyRateSchema, currencyRateDeleteSchema, permissionsReplaceSchema, permissionsModifySchema } from '../validation/admin.validation.js';
import { auditListQuery, auditIdParam } from '../validation/audit.validation.js';
import {
  locationCreateSchema,
  locationUpdateSchema,
  locationIdParam,
  locationListQuery,
  transferCreateSchema,
  transferUpdateSchema,
  transferStatusSchema,
  transferListQuery,
  ledgerListQuery,
  ledgerIdParam
} from '../validation/inventory.validation.js';
import { paymentEventsListSchema, paymentEventIdSchema } from '../validation/payment-events.validation.js';
import { orderTimelineCreateSchema } from '../validation/order-timeline.validation.js';
import { idempotency } from '../../../middleware/idempotency.js';
import {
  listCategories as listCategoriesController,
  createCategory as createCategoryController,
  getCategory as getCategoryController,
  updateCategory as updateCategoryController,
  listChildren as listChildrenController,
  reorderChildren as reorderChildrenController,
  deleteCategory as deleteCategoryController,
  restoreCategory as restoreCategoryController
} from '../controllers/categories.controller.js';
import { categorySchema, reorderSchema } from '../validation/categories.validation.js';
import { brandSchema as brandCreateSchema, brandUpdateSchema, idParam as brandIdParam } from '../validation/brands.validation.js';
import { listBrands as listBrandsController, createBrand as createBrandController, getBrand as getBrandController, updateBrand as updateBrandController, deleteBrand as deleteBrandController } from '../controllers/brands.controller.js';

export const router = Router();

// Users
router.get('/users', authRequired, requireRole(ROLES.ADMIN), listUsersController);
router.get('/users/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getUserByIdController);
router.patch('/users/:id', authRequired, requireRole(ROLES.ADMIN), validate({ ...idParam, ...updateUserSchema }), updateUserController);
router.post('/users/:id/promote', authRequired, requireRole(ROLES.ADMIN), validate(idParam), promoteUserController);
router.post('/users/:id/demote', authRequired, requireRole(ROLES.ADMIN), validate(idParam), demoteUserController);
router.get('/users/:id/permissions', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getUserPermissionsController);
router.post('/users/:id/permissions', authRequired, requireRole(ROLES.ADMIN), validate(permissionsReplaceSchema), replaceUserPermissionsController);
router.patch('/users/:id/permissions/add', authRequired, requireRole(ROLES.ADMIN), validate(permissionsModifySchema), addUserPermissionsController);
router.patch('/users/:id/permissions/remove', authRequired, requireRole(ROLES.ADMIN), validate(permissionsModifySchema), removeUserPermissionsController);

// Metrics
router.get('/metrics', authRequired, requireRole(ROLES.ADMIN), metricsController);

// Audit logs
router.get(
  '/audit',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.AUDIT_VIEW),
  validate(auditListQuery),
  listAuditLogsController
);
router.get(
  '/audit/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.AUDIT_VIEW),
  validate(auditIdParam),
  getAuditLogController
);

// Orders
router.get('/orders', authRequired, requireRole(ROLES.ADMIN), listOrdersController);
router.get('/orders/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getOrderController);
router.patch('/orders/:id', authRequired, requireRole(ROLES.ADMIN), validate(updateOrderSchema), updateOrderController);
router.post(
  '/orders/:id/timeline',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.ORDERS_TIMELINE_WRITE),
  validate(orderTimelineCreateSchema),
  createTimelineEntry
);

// Coupons
router.get('/coupons', authRequired, requireRole(ROLES.ADMIN), listCouponsController);
router.post('/coupons', authRequired, requireRole(ROLES.ADMIN), validate(couponSchema), createCouponController);
router.get('/coupons/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getCouponController);
router.put('/coupons/:id', authRequired, requireRole(ROLES.ADMIN), validate({ ...idParam, ...couponSchema }), updateCouponController);
router.delete('/coupons/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), deleteCouponController);

// Currency rates
router.get('/currency-rates', authRequired, requireRole(ROLES.ADMIN), validate(currencyRateListSchema), listCurrencyRatesController);
router.post('/currency-rates', authRequired, requireRole(ROLES.ADMIN), validate(currencyRateSchema), upsertCurrencyRateController);
router.delete('/currency-rates/:currency', authRequired, requireRole(ROLES.ADMIN), validate(currencyRateDeleteSchema), deleteCurrencyRateController);

// Inventory
router.get('/inventory/adjustments', authRequired, requireRole(ROLES.ADMIN), listAdjustmentsController);
router.post('/inventory/adjustments', authRequired, requireRole(ROLES.ADMIN), validate(adjustSchema), createAdjustmentController);
router.get('/inventory', authRequired, requireRole(ROLES.ADMIN), listInventoryController);
router.get('/inventory/low', authRequired, requireRole(ROLES.ADMIN), lowStockController);
router.get(
  '/inventory/locations',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LOCATION_VIEW),
  validate(locationListQuery),
  listLocationsController
);
router.post(
  '/inventory/locations',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LOCATION_CREATE),
  validate(locationCreateSchema),
  createLocationController
);
router.get(
  '/inventory/locations/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LOCATION_VIEW),
  validate(locationIdParam),
  getLocationController
);
router.put(
  '/inventory/locations/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LOCATION_EDIT),
  validate({ ...locationIdParam, ...locationUpdateSchema }),
  updateLocationController
);
router.delete(
  '/inventory/locations/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LOCATION_DELETE),
  validate(locationIdParam),
  deleteLocationController
);
router.post(
  '/inventory/locations/:id/restore',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LOCATION_EDIT),
  validate(locationIdParam),
  restoreLocationController
);
router.get(
  '/inventory/transfers',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_TRANSFER_VIEW),
  validate(transferListQuery),
  listTransferOrdersController
);
router.post(
  '/inventory/transfers',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_TRANSFER_CREATE),
  validate(transferCreateSchema),
  createTransferOrderController
);
router.get(
  '/inventory/transfers/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_TRANSFER_VIEW),
  validate(idParam),
  getTransferOrderController
);
router.put(
  '/inventory/transfers/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_TRANSFER_EDIT),
  validate({ ...idParam, ...transferUpdateSchema }),
  updateTransferOrderController
);
router.patch(
  '/inventory/transfers/:id/status',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_TRANSFER_EDIT),
  validate(transferStatusSchema),
  transitionTransferOrderController
);
router.get(
  '/inventory/ledger',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LEDGER_VIEW),
  validate(ledgerListQuery),
  listLedgerController
);
router.get(
  '/inventory/ledger/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.INVENTORY_LEDGER_VIEW),
  validate(ledgerIdParam),
  getLedgerEntryController
);

// Returns
router.get('/returns', authRequired, requireRole(ROLES.ADMIN), listReturnsController);
router.post('/returns/:id/approve', authRequired, requireRole(ROLES.ADMIN), idempotency, validate(returnApproveSchema), approveReturnController);
router.post('/returns/:id/reject', authRequired, requireRole(ROLES.ADMIN), rejectReturnController);

// Transactions & Refunds
router.get('/transactions', authRequired, requireRole(ROLES.ADMIN), listTransactionsController);
router.get('/transactions/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getTransactionController);
router.get('/refunds', authRequired, requireRole(ROLES.ADMIN), listRefundsAdminController);
router.get('/refunds/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getRefundAdminController);
router.get(
  '/payment-events',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PAYMENTS_EVENTS_VIEW),
  validate(paymentEventsListSchema),
  listPaymentEvents
);
router.get(
  '/payment-events/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PAYMENTS_EVENTS_VIEW),
  validate(paymentEventIdSchema),
  getPaymentEvent
);

// Shipments
router.get('/shipments', authRequired, requireRole(ROLES.ADMIN), listShipmentsController);
router.post('/orders/:id/shipments', authRequired, requireRole(ROLES.ADMIN), validate(shipmentCreateSchema), createShipmentController);
router.get('/shipments/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getShipmentController);
router.get('/orders/:id/shipments', authRequired, requireRole(ROLES.ADMIN), validate(idParam), listOrderShipmentsController);

// Products CRUD
router.get('/products', authRequired, requireRole(ROLES.ADMIN), listProductsController);
router.get('/products/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getProductController);
router.post(
  '/products',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PRODUCT_CREATE),
  validate(productCreateSchema),
  createProductController
);
router.put(
  '/products/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate({ ...idParam, ...productUpdateSchema }),
  updateProductController
);
router.patch(
  '/products/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate({ ...idParam, ...productUpdateSchema }),
  updateProductController
);
router.delete(
  '/products/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PRODUCT_DELETE),
  validate(idParam),
  deleteProductController
);
router.post(
  '/products/:id/restore',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(idParam),
  restoreProductController
);

// Products admin helpers
router.post('/products/import', authRequired, requireRole(ROLES.ADMIN), validate(importSchema), importProductsController);
router.get('/products/export', authRequired, requireRole(ROLES.ADMIN), exportProductsController);
router.post('/products/price-bulk', authRequired, requireRole(ROLES.ADMIN), validate(priceBulkSchema), priceBulkController);
router.post('/products/category-bulk', authRequired, requireRole(ROLES.ADMIN), validate(categoryBulkSchema), categoryBulkController);
router.post('/products/variants-matrix', authRequired, requireRole(ROLES.ADMIN), validate(variantsMatrixSchema), variantsMatrixController);
router.get('/products/:id/references', authRequired, requireRole(ROLES.ADMIN), validate(idParam), productReferencesController);

// Reports
router.get('/reports/sales', authRequired, requireRole(ROLES.ADMIN), salesReportController);
router.get('/reports/top-products', authRequired, requireRole(ROLES.ADMIN), topProductsReportController);
router.get('/reports/top-customers', authRequired, requireRole(ROLES.ADMIN), topCustomersReportController);

// Categories (admin aliases under /admin)
router.get('/categories', authRequired, requireRole(ROLES.ADMIN), listCategoriesController);
router.get('/categories/:id', authRequired, requireRole(ROLES.ADMIN), getCategoryController);
router.post(
  '/categories',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.CATEGORY_CREATE),
  validate(categorySchema),
  createCategoryController
);
router.put(
  '/categories/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.CATEGORY_EDIT),
  validate(categorySchema),
  updateCategoryController
);
router.delete(
  '/categories/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.CATEGORY_DELETE),
  deleteCategoryController
);
router.post(
  '/categories/:id/restore',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.CATEGORY_RESTORE),
  restoreCategoryController
);
router.get('/categories/:id/children', authRequired, requireRole(ROLES.ADMIN), listChildrenController);
router.post(
  '/categories/:id/reorder',
  authRequired,
  requireRole(ROLES.ADMIN),
  checkPermission(PERMISSIONS.CATEGORY_EDIT),
  validate(reorderSchema),
  reorderChildrenController
);

// Brands (admin)
router.get('/brands', authRequired, requireRole(ROLES.ADMIN), listBrandsController);
router.post('/brands', authRequired, requireRole(ROLES.ADMIN), validate(brandCreateSchema), createBrandController);
router.get('/brands/:id', authRequired, requireRole(ROLES.ADMIN), validate(brandIdParam), getBrandController);
router.put('/brands/:id', authRequired, requireRole(ROLES.ADMIN), validate(brandUpdateSchema), updateBrandController);
router.delete('/brands/:id', authRequired, requireRole(ROLES.ADMIN), validate(brandIdParam), deleteBrandController);
router.get('/brands/:id/references', authRequired, requireRole(ROLES.ADMIN), validate(brandIdParam), brandReferencesController);





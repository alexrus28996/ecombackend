import { Router } from 'express';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { config } from '../../../config/index.js';
import {
  listUsers as listUsersController,
  getUserById as getUserByIdController,
  updateUser as updateUserController,
  promoteUser as promoteUserController,
  demoteUser as demoteUserController,
  metrics as metricsController,
  listOrders as listOrdersController,
  getOrder as getOrderController,
  updateOrder as updateOrderController,
  listCouponsController,
  createCouponController,
  getCouponController,
  updateCouponController,
  deleteCouponController,
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
  productReferencesController,
  brandReferencesController
} from '../controllers/admin.controller.js';
import { idParam, updateUserSchema, updateOrderSchema, couponSchema, adjustSchema, importSchema, priceBulkSchema, categoryBulkSchema, shipmentCreateSchema, variantsMatrixSchema, returnApproveSchema } from '../validation/admin.validation.js';
import { idempotency } from '../../../middleware/idempotency.js';
import {
  listCategories as listCategoriesController,
  createCategory as createCategoryController,
  getCategory as getCategoryController,
  updateCategory as updateCategoryController,
  listChildren as listChildrenController,
  reorderChildren as reorderChildrenController,
  deleteCategory as deleteCategoryController
} from '../controllers/categories.controller.js';
import { categorySchema, reorderSchema } from '../validation/categories.validation.js';
import { brandSchema as brandCreateSchema, idParam as brandIdParam } from '../validation/brands.validation.js';
import { listBrands as listBrandsController, createBrand as createBrandController, getBrand as getBrandController, updateBrand as updateBrandController, deleteBrand as deleteBrandController } from '../controllers/brands.controller.js';

export const router = Router();

// Users
router.get('/users', authRequired, requireRole(ROLES.ADMIN), listUsersController);
router.get('/users/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getUserByIdController);
router.patch('/users/:id', authRequired, requireRole(ROLES.ADMIN), validate({ ...idParam, ...updateUserSchema }), updateUserController);
router.post('/users/:id/promote', authRequired, requireRole(ROLES.ADMIN), validate(idParam), promoteUserController);
router.post('/users/:id/demote', authRequired, requireRole(ROLES.ADMIN), validate(idParam), demoteUserController);

// Metrics
router.get('/metrics', authRequired, requireRole(ROLES.ADMIN), metricsController);

// Orders
router.get('/orders', authRequired, requireRole(ROLES.ADMIN), listOrdersController);
router.get('/orders/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getOrderController);
router.patch('/orders/:id', authRequired, requireRole(ROLES.ADMIN), validate(updateOrderSchema), updateOrderController);

// Coupons
router.get('/coupons', authRequired, requireRole(ROLES.ADMIN), listCouponsController);
router.post('/coupons', authRequired, requireRole(ROLES.ADMIN), validate(couponSchema), createCouponController);
router.get('/coupons/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getCouponController);
router.put('/coupons/:id', authRequired, requireRole(ROLES.ADMIN), validate({ ...idParam, ...couponSchema }), updateCouponController);
router.delete('/coupons/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), deleteCouponController);

// Inventory
router.get('/inventory/adjustments', authRequired, requireRole(ROLES.ADMIN), listAdjustmentsController);
router.post('/inventory/adjustments', authRequired, requireRole(ROLES.ADMIN), validate(adjustSchema), createAdjustmentController);
router.get('/inventory', authRequired, requireRole(ROLES.ADMIN), listInventoryController);
router.get('/inventory/low', authRequired, requireRole(ROLES.ADMIN), lowStockController);

// Returns
router.get('/returns', authRequired, requireRole(ROLES.ADMIN), listReturnsController);
router.post('/returns/:id/approve', authRequired, requireRole(ROLES.ADMIN), idempotency, validate(returnApproveSchema), approveReturnController);
router.post('/returns/:id/reject', authRequired, requireRole(ROLES.ADMIN), rejectReturnController);

// Transactions & Refunds
router.get('/transactions', authRequired, requireRole(ROLES.ADMIN), listTransactionsController);
router.get('/transactions/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getTransactionController);
router.get('/refunds', authRequired, requireRole(ROLES.ADMIN), listRefundsAdminController);
router.get('/refunds/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getRefundAdminController);

// Shipments
router.get('/shipments', authRequired, requireRole(ROLES.ADMIN), listShipmentsController);
router.post('/orders/:id/shipments', authRequired, requireRole(ROLES.ADMIN), validate(shipmentCreateSchema), createShipmentController);
router.get('/shipments/:id', authRequired, requireRole(ROLES.ADMIN), validate(idParam), getShipmentController);
router.get('/orders/:id/shipments', authRequired, requireRole(ROLES.ADMIN), validate(idParam), listOrderShipmentsController);

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
router.post('/categories', authRequired, requireRole(ROLES.ADMIN), validate(categorySchema), createCategoryController);
router.put('/categories/:id', authRequired, requireRole(ROLES.ADMIN), validate(categorySchema), updateCategoryController);
router.delete('/categories/:id', authRequired, requireRole(ROLES.ADMIN), deleteCategoryController);
router.get('/categories/:id/children', authRequired, requireRole(ROLES.ADMIN), listChildrenController);
router.post('/categories/:id/reorder', authRequired, requireRole(ROLES.ADMIN), validate(reorderSchema), reorderChildrenController);

// Brands (admin)
router.get('/brands', authRequired, requireRole(ROLES.ADMIN), listBrandsController);
router.post('/brands', authRequired, requireRole(ROLES.ADMIN), validate(brandCreateSchema), createBrandController);
router.get('/brands/:id', authRequired, requireRole(ROLES.ADMIN), validate(brandIdParam), getBrandController);
router.put('/brands/:id', authRequired, requireRole(ROLES.ADMIN), validate(brandCreateSchema), updateBrandController);
router.delete('/brands/:id', authRequired, requireRole(ROLES.ADMIN), validate(brandIdParam), deleteBrandController);
router.get('/brands/:id/references', authRequired, requireRole(ROLES.ADMIN), validate(brandIdParam), brandReferencesController);

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
  importProductsController,
  exportProductsController,
  salesReportController,
  topProductsReportController,
  topCustomersReportController,
  lowStockController,
  priceBulkController,
  categoryBulkController
} from '../controllers/admin.controller.js';
import { idParam, updateUserSchema, updateOrderSchema, couponSchema, adjustSchema, importSchema, priceBulkSchema, categoryBulkSchema } from '../validation/admin.validation.js';
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
router.post('/returns/:id/approve', authRequired, requireRole(ROLES.ADMIN), approveReturnController);
router.post('/returns/:id/reject', authRequired, requireRole(ROLES.ADMIN), rejectReturnController);

// Products admin helpers
router.post('/products/import', authRequired, requireRole(ROLES.ADMIN), validate(importSchema), importProductsController);
router.get('/products/export', authRequired, requireRole(ROLES.ADMIN), exportProductsController);
router.post('/products/price-bulk', authRequired, requireRole(ROLES.ADMIN), validate(priceBulkSchema), priceBulkController);
router.post('/products/category-bulk', authRequired, requireRole(ROLES.ADMIN), validate(categoryBulkSchema), categoryBulkController);

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

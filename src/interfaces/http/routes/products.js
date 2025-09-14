import { Router } from 'express';
import {
  listProducts as listProductsController,
  getProduct as getProductController,
  createProduct as createProductController,
  updateProduct as updateProductController,
  deleteProduct as deleteProductController
} from '../controllers/products.controller.js';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { productSchema } from '../validation/products.validation.js';

/**
 * Product catalog routes: list, detail, and admin CRUD.
 */
export const router = Router();

// List products with basic search and pagination
router.get('/', listProductsController);

// Get product by id
router.get('/:id', getProductController);

// Create a product (admin)
router.post('/', authRequired, requireRole(ROLES.ADMIN), validate(productSchema), createProductController);

// Update a product (admin)
router.put('/:id', authRequired, requireRole(ROLES.ADMIN), validate(productSchema), updateProductController);

// Delete a product (admin)
router.delete('/:id', authRequired, requireRole(ROLES.ADMIN), deleteProductController);

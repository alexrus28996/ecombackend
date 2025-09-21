import { Router } from 'express';
import {
  listBrands as listBrandsController,
  createBrand as createBrandController,
  getBrand as getBrandController,
  updateBrand as updateBrandController,
  deleteBrand as deleteBrandController
} from '../controllers/brands.controller.js';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { brandSchema, brandUpdateSchema, idParam } from '../validation/brands.validation.js';

/**
 * Brand catalog routes for both public access and admin CRUD.
 */
export const router = Router();

// Public list/search
router.get('/', listBrandsController);

// Public fetch
router.get('/:id', validate(idParam), getBrandController);

// Admin create
router.post(
  '/',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(brandSchema),
  createBrandController
);

// Admin update
router.put(
  '/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(brandUpdateSchema),
  updateBrandController
);

// Admin delete
router.delete(
  '/:id',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(idParam),
  deleteBrandController
);

export default router;

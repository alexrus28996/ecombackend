import { Router } from 'express';
import { validate } from '../../../middleware/validate.js';
import { authRequired } from '../../../middleware/auth.js';
import checkPermission from '../../../middleware/checkPermission.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
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

// Public list of categories
router.get('/', listCategoriesController);

// Public get category by id
router.get('/:id', getCategoryController);

// Admin create category
router.post('/', authRequired, checkPermission(PERMISSIONS.CATEGORY_CREATE), validate(categorySchema), createCategoryController);

// Admin update category
router.put('/:id', authRequired, checkPermission(PERMISSIONS.CATEGORY_EDIT), validate(categorySchema), updateCategoryController);

// List children of a category
router.get('/:id/children', listChildrenController);

// Reorder children for a category: set sortOrder based on provided IDs order
router.post('/:id/reorder', authRequired, checkPermission(PERMISSIONS.CATEGORY_EDIT), validate(reorderSchema), reorderChildrenController);

// Admin delete category
router.delete('/:id', authRequired, checkPermission(PERMISSIONS.CATEGORY_DELETE), deleteCategoryController);

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory
} from '../controllers/categoryController.js';
import { authRequired } from '../middleware/auth.js';
import checkPermission from '../middleware/checkPermission.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', authRequired, checkPermission(PERMISSIONS.CATEGORY_CREATE), writeLimiter, createCategory);
router.patch(
  '/:id',
  authRequired,
  checkPermission(PERMISSIONS.CATEGORY_EDIT),
  writeLimiter,
  updateCategory
);
router.delete(
  '/:id',
  authRequired,
  checkPermission(PERMISSIONS.CATEGORY_DELETE),
  writeLimiter,
  deleteCategory
);

export const categoryRouter = router;

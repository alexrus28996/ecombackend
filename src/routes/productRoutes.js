import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from '../controllers/productController.js';
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

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', authRequired, checkPermission(PERMISSIONS.PRODUCT_CREATE), writeLimiter, createProduct);
router.patch('/:id', authRequired, checkPermission(PERMISSIONS.PRODUCT_EDIT), writeLimiter, updateProduct);
router.delete('/:id', authRequired, checkPermission(PERMISSIONS.PRODUCT_DELETE), writeLimiter, deleteProduct);

export const productRouter = router;

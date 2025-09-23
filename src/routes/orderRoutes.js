import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authRequired } from '../middleware/auth.js';
import checkPermission from '../middleware/checkPermission.js';
import { createOrder, getOrderById, listOrders, updateOrderStatus } from '../controllers/orderController.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

function requireOrderCreate(req, res, next) {
  const permissions = req.user?.permissions || [];
  if (permissions.includes(PERMISSIONS.ORDER_CREATE) || permissions.includes(PERMISSIONS.ORDER_MANAGE)) {
    return next();
  }
  return res.status(403).json({ error: `Forbidden: Missing permission ${PERMISSIONS.ORDER_CREATE}` });
}

router.post('/', authRequired, requireOrderCreate, writeLimiter, createOrder);
router.get('/', authRequired, listOrders);
router.get('/:id', authRequired, getOrderById);
router.patch('/:id/status', authRequired, checkPermission(PERMISSIONS.ORDER_MANAGE), writeLimiter, updateOrderStatus);

export const orderRouter = router;

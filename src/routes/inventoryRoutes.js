import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { bulkUpdateInventory, updateInventory } from '../controllers/inventoryController.js';
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

router.patch('/bulk', authRequired, checkPermission(PERMISSIONS.INVENTORY_MANAGE), writeLimiter, bulkUpdateInventory);
router.patch('/:id', authRequired, checkPermission(PERMISSIONS.INVENTORY_MANAGE), writeLimiter, updateInventory);

export const inventoryRouter = router;

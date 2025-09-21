import { Router } from 'express';
import { authRequired, requireAnyRole } from '../../../middleware/auth.js';
import { ROLES } from '../../../config/constants.js';
import { queryStockController, adjustStockController, reconcileStockController } from '../controllers/stock.controller.js';

export const stockRouter = Router();

const readRoles = [ROLES.SUPPORT, ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];
const manageRoles = [ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];

stockRouter.get('/', authRequired, requireAnyRole(readRoles), queryStockController);
stockRouter.post('/adjust', authRequired, requireAnyRole(manageRoles), adjustStockController);
stockRouter.post('/reconcile', authRequired, requireAnyRole(manageRoles), reconcileStockController);

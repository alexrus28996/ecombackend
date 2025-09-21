import { Router } from 'express';
import { authRequired, requireAnyRole } from '../../../middleware/auth.js';
import { ROLES } from '../../../config/constants.js';
import { pickingQuoteController, pickingAllocateController } from '../controllers/picking.controller.js';

export const pickingRouter = Router();

const readRoles = [ROLES.SUPPORT, ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];
const manageRoles = [ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];

pickingRouter.post('/quote', authRequired, requireAnyRole(readRoles), pickingQuoteController);
pickingRouter.post('/allocate', authRequired, requireAnyRole(manageRoles), pickingAllocateController);

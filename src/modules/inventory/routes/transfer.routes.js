import { Router } from 'express';
import { authRequired, requireAnyRole } from '../../../middleware/auth.js';
import { ROLES } from '../../../config/constants.js';
import {
  createTransferOrderController,
  transitionTransferOrderController,
  listTransferOrdersController
} from '../controllers/transfer.controller.js';

export const transferRouter = Router();

const manageRoles = [ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];

transferRouter.get('/', authRequired, requireAnyRole(manageRoles), listTransferOrdersController);
transferRouter.post('/', authRequired, requireAnyRole(manageRoles), createTransferOrderController);
transferRouter.patch('/:id', authRequired, requireAnyRole(manageRoles), transitionTransferOrderController);

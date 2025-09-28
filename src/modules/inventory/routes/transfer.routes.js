import { Router } from 'express';
import { authRequired, requireAnyRole } from '../../../middleware/auth.js';
import { ROLES } from '../../../config/constants.js';
import {
  createTransferOrderController,
  transitionTransferOrderController,
  listTransferOrdersController,
  updateTransferOrderController,
  getTransferOrderController
} from '../controllers/transfer.controller.js';

export const transferRouter = Router();

const manageRoles = [ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];

transferRouter.get('/', authRequired, requireAnyRole(manageRoles), listTransferOrdersController);
transferRouter.post('/', authRequired, requireAnyRole(manageRoles), createTransferOrderController);
transferRouter.get('/:id', authRequired, requireAnyRole(manageRoles), getTransferOrderController);
transferRouter.put('/:id', authRequired, requireAnyRole(manageRoles), updateTransferOrderController);
transferRouter.patch('/:id/status', authRequired, requireAnyRole(manageRoles), transitionTransferOrderController);

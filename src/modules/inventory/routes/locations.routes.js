import { Router } from 'express';
import { authRequired, requireAnyRole } from '../../../middleware/auth.js';
import { ROLES } from '../../../config/constants.js';
import {
  createLocationController,
  listLocationsController,
  updateLocationController,
  deleteLocationController,
  getLocationController
} from '../controllers/location.controller.js';

export const locationsRouter = Router();

const readRoles = [ROLES.SUPPORT, ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];
const manageRoles = [ROLES.WAREHOUSE_MANAGER, ROLES.OPS_ADMIN, ROLES.ADMIN];

locationsRouter.get('/', authRequired, requireAnyRole(readRoles), listLocationsController);
locationsRouter.post('/', authRequired, requireAnyRole(manageRoles), createLocationController);
locationsRouter.get('/:id', authRequired, requireAnyRole(readRoles), getLocationController);
locationsRouter.patch('/:id', authRequired, requireAnyRole(manageRoles), updateLocationController);
locationsRouter.delete('/:id', authRequired, requireAnyRole(manageRoles), deleteLocationController);

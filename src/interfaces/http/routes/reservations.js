import { Router } from 'express';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { listReservations, releaseReservationsForOrder } from '../controllers/reservations.controller.js';
import { releaseReservationsSchema } from '../validation/reservations.validation.js';

export const router = Router();

router.get('/', authRequired, requireRole(ROLES.ADMIN), listReservations);
router.post('/:orderId/release', authRequired, requireRole(ROLES.ADMIN), validate(releaseReservationsSchema), releaseReservationsForOrder);

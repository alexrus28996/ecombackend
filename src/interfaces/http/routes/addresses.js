import { Router } from 'express';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { createAddress as createAddressController, listAddresses as listAddressesController, getAddress as getAddressController, updateAddress as updateAddressController, deleteAddress as deleteAddressController, setDefault as setDefaultController } from '../controllers/addresses.controller.js';
import { createAddressSchema, updateAddressSchema, idParam } from '../validation/addresses.validation.js';

export const router = Router();

router.use(authRequired);

router.get('/', listAddressesController);
router.post('/', validate(createAddressSchema), createAddressController);
router.get('/:id', validate(idParam), getAddressController);
router.put('/:id', validate(updateAddressSchema), updateAddressController);
router.delete('/:id', validate(idParam), deleteAddressController);
router.post('/:id/default', validate(idParam), setDefaultController);


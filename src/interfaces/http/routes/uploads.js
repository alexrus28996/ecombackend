import { Router } from 'express';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { ROLES } from '../../../config/constants.js';
import { uploadImage } from '../../../utils/uploads.js';
import multer from 'multer';
import { localUploadHandler, cloudinaryUploadHandler, cloudinaryDeleteHandler } from '../controllers/uploads.controller.js';
import { validate } from '../../../middleware/validate.js';
import { cloudinaryDeleteSchema } from '../validation/uploads.validation.js';

export const router = Router();

// Upload a single image file (field name: "file")
router.post('/', authRequired, requireRole(ROLES.ADMIN), uploadImage.single('file'), localUploadHandler);

// Cloudinary upload (admin). Field: file
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/cloudinary', authRequired, requireRole(ROLES.ADMIN), memoryUpload.single('file'), cloudinaryUploadHandler);

// Cloudinary delete by publicId
router.post('/cloudinary/delete', authRequired, requireRole(ROLES.ADMIN), validate(cloudinaryDeleteSchema), cloudinaryDeleteHandler);

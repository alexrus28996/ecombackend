import { Router } from 'express';
import {
  listProducts as listProductsController,
  getProduct as getProductController,
  createProduct as createProductController,
  updateProduct as updateProductController,
  deleteProduct as deleteProductController
} from '../controllers/products.controller.js';
import {
  listProductAttributes,
  createProductAttribute,
  updateProductAttribute,
  deleteProductAttribute,
  listAttributeOptions,
  createAttributeOption,
  updateAttributeOption,
  deleteAttributeOption
} from '../controllers/product-attributes.controller.js';
import {
  listProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  generateProductVariantsMatrix,
  getProductVariant
} from '../controllers/product-variants.controller.js';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { productCreateSchema, productUpdateSchema } from '../validation/products.validation.js';
import {
  attributeCreateSchema,
  attributeUpdateSchema,
  optionCreateSchema,
  optionUpdateSchema,
  variantCreateSchema,
  variantUpdateSchema,
  variantMatrixSchema
} from '../validation/product-attributes.validation.js';

/**
 * Product catalog routes: list, detail, and admin CRUD.
 */
export const router = Router();

// List products with basic search and pagination
router.get('/', listProductsController);

// Get product by id
router.get('/:id', getProductController);

// Attribute CRUD
router.get('/:productId/attributes', listProductAttributes);
router.post(
  '/:productId/attributes',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(attributeCreateSchema),
  createProductAttribute
);
router.put(
  '/:productId/attributes/:attributeId',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(attributeUpdateSchema),
  updateProductAttribute
);
router.delete(
  '/:productId/attributes/:attributeId',
  authRequired,
  requireRole(ROLES.ADMIN),
  deleteProductAttribute
);

// Attribute option CRUD
router.get('/:productId/attributes/:attributeId/options', listAttributeOptions);
router.post(
  '/:productId/attributes/:attributeId/options',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(optionCreateSchema),
  createAttributeOption
);
router.put(
  '/:productId/attributes/:attributeId/options/:optionId',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(optionUpdateSchema),
  updateAttributeOption
);
router.delete(
  '/:productId/attributes/:attributeId/options/:optionId',
  authRequired,
  requireRole(ROLES.ADMIN),
  deleteAttributeOption
);

// Variant CRUD & matrix
router.get('/:productId/variants', listProductVariants);
router.get('/:productId/variants/:variantId', getProductVariant);
router.post(
  '/:productId/variants',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(variantCreateSchema),
  createProductVariant
);
router.put(
  '/:productId/variants/:variantId',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(variantUpdateSchema),
  updateProductVariant
);
router.delete(
  '/:productId/variants/:variantId',
  authRequired,
  requireRole(ROLES.ADMIN),
  deleteProductVariant
);
router.post(
  '/:productId/variants-matrix',
  authRequired,
  requireRole(ROLES.ADMIN),
  validate(variantMatrixSchema),
  generateProductVariantsMatrix
);

// Create a product (admin)
router.post('/', authRequired, requireRole(ROLES.ADMIN), validate(productCreateSchema), createProductController);

// Update a product (admin)
router.put('/:id', authRequired, requireRole(ROLES.ADMIN), validate(productUpdateSchema), updateProductController);
router.patch('/:id', authRequired, requireRole(ROLES.ADMIN), validate(productUpdateSchema), updateProductController);

// Delete a product (admin)
router.delete('/:id', authRequired, requireRole(ROLES.ADMIN), deleteProductController);

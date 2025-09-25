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
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import checkPermission from '../../../middleware/checkPermission.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
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
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(attributeCreateSchema),
  createProductAttribute
);
router.put(
  '/:productId/attributes/:attributeId',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(attributeUpdateSchema),
  updateProductAttribute
);
router.delete(
  '/:productId/attributes/:attributeId',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  deleteProductAttribute
);

// Attribute option CRUD
router.get('/:productId/attributes/:attributeId/options', listAttributeOptions);
router.post(
  '/:productId/attributes/:attributeId/options',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(optionCreateSchema),
  createAttributeOption
);
router.put(
  '/:productId/attributes/:attributeId/options/:optionId',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(optionUpdateSchema),
  updateAttributeOption
);
router.delete(
  '/:productId/attributes/:attributeId/options/:optionId',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  deleteAttributeOption
);

// Variant CRUD & matrix
router.get('/:productId/variants', listProductVariants);
router.get('/:productId/variants/:variantId', getProductVariant);
router.post(
  '/:productId/variants',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(variantCreateSchema),
  createProductVariant
);
router.put(
  '/:productId/variants/:variantId',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(variantUpdateSchema),
  updateProductVariant
);
router.delete(
  '/:productId/variants/:variantId',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  deleteProductVariant
);
router.post(
  '/:productId/variants-matrix',
  authRequired,
  checkPermission(PERMISSIONS.PRODUCT_EDIT),
  validate(variantMatrixSchema),
  generateProductVariantsMatrix
);

// Create a product (admin)
router.post('/', authRequired, checkPermission(PERMISSIONS.PRODUCT_CREATE), validate(productCreateSchema), createProductController);

// Update a product (admin)
router.put('/:id', authRequired, checkPermission(PERMISSIONS.PRODUCT_EDIT), validate(productUpdateSchema), updateProductController);
router.patch('/:id', authRequired, checkPermission(PERMISSIONS.PRODUCT_EDIT), validate(productUpdateSchema), updateProductController);

// Delete a product (admin)
router.delete('/:id', authRequired, checkPermission(PERMISSIONS.PRODUCT_DELETE), deleteProductController);

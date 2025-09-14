import { Router } from 'express';
import { z } from 'zod';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../../../modules/catalog/product.service.js';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { config } from '../../../config/index.js';

/**
 * Product catalog routes: list, detail, and admin CRUD.
 */
export const router = Router();

// List products with basic search and pagination
router.get('/', async (req, res) => {
  const { q } = req.query;
  const limitRaw = req.query.limit ?? config.API_DEFAULT_PAGE_SIZE;
  const pageRaw = req.query.page ?? 1;
  const limit = Math.min(Number(limitRaw) || config.API_DEFAULT_PAGE_SIZE, config.API_MAX_PAGE_SIZE);
  const page = Math.max(Number(pageRaw) || 1, 1);
  const result = await listProducts({ q, limit, page });
  res.json(result);
});

// Get product by id
router.get('/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  res.json({ product });
});

// Validation schema for product payloads
const productSchema = {
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.coerce.number().nonnegative(),
    currency: z.string().default(config.DEFAULT_CURRENCY),
    images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).optional(),
    attributes: z.record(z.string()).optional(),
    stock: z.coerce.number().int().nonnegative().default(0),
    isActive: z.coerce.boolean().optional()
  })
};

// Create a product (admin)
router.post('/', authRequired, requireRole(ROLES.ADMIN), validate(productSchema), async (req, res) => {
  const product = await createProduct(req.validated.body);
  res.status(201).json({ product });
});

// Update a product (admin)
router.put('/:id', authRequired, requireRole(ROLES.ADMIN), validate(productSchema), async (req, res) => {
  const product = await updateProduct(req.params.id, req.validated.body);
  res.json({ product });
});

// Delete a product (admin)
router.delete('/:id', authRequired, requireRole(ROLES.ADMIN), async (req, res) => {
  const result = await deleteProduct(req.params.id);
  res.json(result);
});

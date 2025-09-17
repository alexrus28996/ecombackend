import { listProducts as svcList, getProduct as svcGet, createProduct as svcCreate, updateProduct as svcUpdate, deleteProduct as svcDelete } from '../../../modules/catalog/product.service.js';
import { Category } from '../../../modules/catalog/category.model.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';
import { config } from '../../../config/index.js';

export async function listProducts(req, res) {
  const { q, category } = req.query;
  const limitRaw = req.query.limit ?? config.API_DEFAULT_PAGE_SIZE;
  const pageRaw = req.query.page ?? 1;
  const limit = Math.min(Number(limitRaw) || config.API_DEFAULT_PAGE_SIZE, config.API_MAX_PAGE_SIZE);
  const page = Math.max(Number(pageRaw) || 1, 1);
  const result = await svcList({ q, category, limit, page });
  res.json(result);
}

export async function getProduct(req, res) {
  const product = await svcGet(req.params.id);
  res.json({ product });
}

export async function createProduct(req, res) {
  // Enforce category presence and validity
  const catId = req.validated.body.category;
  const cat = await Category.findById(catId).lean();
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  const hasChildren = await Category.exists({ parent: catId });
  if (hasChildren) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category must be a leaf (no children)' });
  const product = await svcCreate(req.validated.body);
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  if (req.validated.body.category) {
    const catId = req.validated.body.category;
    const cat = await Category.findById(catId).lean();
    if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
    const hasChildren = await Category.exists({ parent: catId });
    if (hasChildren) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category must be a leaf (no children)' });
  }
  const product = await svcUpdate(req.params.id, req.validated.body);
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const result = await svcDelete(req.params.id);
  res.json(result);
}

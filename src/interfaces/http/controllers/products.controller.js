import {
  listProducts as svcList,
  getProduct as svcGet,
  createProduct as svcCreate,
  updateProduct as svcUpdate,
  deleteProduct as svcDelete,
  restoreProduct as svcRestore
} from '../../../modules/catalog/product.service.js';
import { Category } from '../../../modules/catalog/category.model.js';
import { Brand } from '../../../modules/catalog/brand.model.js';
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
  const payload = { ...req.validated.body };
  const catId = payload.category;
  const cat = await Category.findById(catId).lean();
  if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
  const hasChildren = await Category.exists({ parent: catId });
  if (hasChildren) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category must be a leaf (no children)' });
  if ('brandId' in payload || 'brand' in payload) {
    const brandId = payload.brandId ?? payload.brand;
    if (brandId === null || brandId === '') {
      payload.brand = null;
    } else if (brandId) {
      const brand = await Brand.findById(brandId).lean();
      if (!brand) throw errors.notFound(ERROR_CODES.BRAND_NOT_FOUND);
      payload.brand = brand._id;
    }
  }
  delete payload.brandId;
  const product = await svcCreate(payload);
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  const payload = { ...req.validated.body };
  if (payload.category) {
    const catId = payload.category;
    const cat = await Category.findById(catId).lean();
    if (!cat) throw errors.notFound(ERROR_CODES.CATEGORY_NOT_FOUND);
    const hasChildren = await Category.exists({ parent: catId });
    if (hasChildren) throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Category must be a leaf (no children)' });
  }
  if ('brandId' in payload || 'brand' in payload) {
    const brandId = payload.brandId ?? payload.brand;
    if (brandId === null || brandId === '') {
      payload.brand = null;
    } else if (brandId) {
      const brand = await Brand.findById(brandId).lean();
      if (!brand) throw errors.notFound(ERROR_CODES.BRAND_NOT_FOUND);
      payload.brand = brand._id;
    }
  }
  delete payload.brandId;
  const product = await svcUpdate(req.params.id, payload);
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const result = await svcDelete(req.params.id);
  res.json(result);
}

export async function restoreProduct(req, res) {
  const product = await svcRestore(req.params.id);
  res.json({ product });
}

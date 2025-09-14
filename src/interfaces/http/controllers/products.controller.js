import { listProducts as svcList, getProduct as svcGet, createProduct as svcCreate, updateProduct as svcUpdate, deleteProduct as svcDelete } from '../../../modules/catalog/product.service.js';
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
  const product = await svcCreate(req.validated.body);
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  const product = await svcUpdate(req.params.id, req.validated.body);
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const result = await svcDelete(req.params.id);
  res.json(result);
}


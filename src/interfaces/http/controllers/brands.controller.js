import { listBrands as svcList, createBrand as svcCreate, getBrand as svcGet, updateBrand as svcUpdate, deleteBrand as svcDelete } from '../../../modules/catalog/brand.service.js';
import { ERROR_CODES } from '../../../errors/index.js';

export async function listBrands(req, res) {
  const { q, page, limit } = req.query;
  const result = await svcList({ q, page, limit });
  res.json(result);
}

export async function createBrand(req, res) {
  const brand = await svcCreate(req.validated.body);
  res.status(201).json({ brand });
}

export async function getBrand(req, res) {
  const brand = await svcGet(req.params.id);
  if (!brand) return res.status(404).json({ error: { message: 'Brand not found' } });
  res.json({ brand });
}

export async function updateBrand(req, res) {
  const brand = await svcUpdate(req.params.id, req.validated.body);
  if (!brand) return res.status(404).json({ error: { message: 'Brand not found' } });
  res.json({ brand });
}

export async function deleteBrand(req, res) {
  const out = await svcDelete(req.params.id);
  if (!out.success) return res.status(409).json({ error: { message: out.message || 'Cannot delete brand', code: ERROR_CODES.BRAND_HAS_PRODUCTS } });
  res.json(out);
}

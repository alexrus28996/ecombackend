import slugify from 'slugify';
import {
  listBrands as svcList,
  createBrand as svcCreate,
  getBrand as svcGet,
  updateBrand as svcUpdate,
  deleteBrand as svcDelete
} from '../../../modules/catalog/brand.service.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';

export async function listBrands(req, res) {
  const { q, page, limit } = req.query;
  const result = await svcList({ q, page, limit });
  res.json(result);
}

export async function createBrand(req, res) {
  const payload = normalizePayload(req.validated.body);
  const brand = await svcCreate(payload);
  res.status(201).json({ brand });
}

export async function getBrand(req, res) {
  const id = req.validated?.params?.id || req.params.id;
  const brand = await svcGet(id);
  if (!brand) throw errors.notFound(ERROR_CODES.BRAND_NOT_FOUND);
  res.json({ brand });
}

export async function updateBrand(req, res) {
  const payload = normalizePayload(req.validated.body);
  const id = req.validated?.params?.id || req.params.id;
  const brand = await svcUpdate(id, payload);
  res.json({ brand });
}

export async function deleteBrand(req, res) {
  const id = req.validated?.params?.id || req.params.id;
  const out = await svcDelete(id);
  res.json(out);
}

function normalizePayload(body) {
  const payload = { ...body };
  if (payload.name) payload.name = payload.name.trim();
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
  if (payload.slug) {
    payload.slug = slugify(payload.slug, { lower: true, strict: true });
  } else if (payload.slug === '') {
    delete payload.slug;
  }
  if (payload.logo === '') delete payload.logo;
  return payload;
}

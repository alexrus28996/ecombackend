import { listCategories as svcList, createCategory as svcCreate, getCategory as svcGet, updateCategory as svcUpdate, deleteCategory as svcDelete, restoreCategory as svcRestore } from '../../../modules/catalog/category.service.js';
import slugify from 'slugify';

function isAdminRequest(req) {
  return typeof req.baseUrl === 'string' && req.baseUrl.includes('/admin');
}

function shouldIncludeDeleted(req) {
  return isAdminRequest(req) && req.query.includeDeleted === 'true';
}

export async function listCategories(req, res) {
  const { q, page, limit, parent } = req.query;
  const includeDeleted = shouldIncludeDeleted(req);
  const result = await svcList({ q, page, limit, parent, includeDeleted });
  res.json(result);
}

export async function getCategory(req, res) {
  const includeDeleted = shouldIncludeDeleted(req);
  const cat = await svcGet(req.params.id, { includeDeleted });
  res.json({ category: cat });
}

export async function createCategory(req, res) {
  const payload = { ...req.validated.body };
  if (payload.parent === '') payload.parent = null;
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
  const cat = await svcCreate(payload);
  res.status(201).json({ category: cat });
}

export async function updateCategory(req, res) {
  const payload = { ...req.validated.body };
  if (payload.parent === '') payload.parent = null;
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
  const cat = await svcUpdate(req.params.id, payload);
  res.json({ category: cat });
}

export async function listChildren(req, res) {
  const { page, limit } = req.query;
  const includeDeleted = shouldIncludeDeleted(req);
  const result = await svcList({ parent: req.params.id, page, limit, includeDeleted });
  res.json(result);
}

export async function reorderChildren(req, res) {
  const parentId = req.params.id;
  const ids = req.validated.body.ids;
  const updates = ids.map((id, idx) => ({ updateOne: { filter: { _id: id, parent: parentId }, update: { $set: { sortOrder: idx } } } }));
  if (updates.length > 0) await (await import('../../../modules/catalog/category.model.js')).Category.bulkWrite(updates);
  const result = await svcList({ parent: parentId, page: 1, limit: 100 });
  res.json(result);
}

export async function deleteCategory(req, res) {
  const result = await svcDelete(req.params.id);
  res.json(result);
}

export async function restoreCategory(req, res) {
  const category = await svcRestore(req.params.id);
  res.json({ category });
}


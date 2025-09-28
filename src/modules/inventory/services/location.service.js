import mongoose from 'mongoose';
import { Location } from '../models/location.model.js';
import { errors, ERROR_CODES } from '../../../errors/index.js';

export async function createLocation(payload) {
  try {
    const doc = await Location.create(payload);
    return doc.toObject();
  } catch (err) {
    if (err?.code === 11000) {
      throw errors.conflict(ERROR_CODES.RESOURCE_ALREADY_EXISTS, 'Location already exists');
    }
    throw err;
  }
}

export async function listLocations({ type, active, region, country, page = 1, limit = 50, state = 'active' } = {}) {
  const filter = {};
  if (state === 'active') filter.deletedAt = null;
  else if (state === 'deleted') filter.deletedAt = { $ne: null };
  if (type) filter.type = type;
  if (typeof active === 'boolean') filter.active = active;
  if (region) filter['geo.region'] = region;
  if (country) filter['geo.country'] = country;
  const l = Math.min(200, Math.max(1, Number(limit) || 50));
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    Location.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(l).lean(),
    Location.countDocuments(filter)
  ]);
  return { items, page: p, pages: Math.ceil(total / l) || 1, total };
}

export async function updateLocation(id, updates) {
  const _id = new mongoose.Types.ObjectId(id);
  const doc = await Location.findOneAndUpdate(
    { _id, deletedAt: null },
    { $set: { ...updates, updatedAt: new Date() } },
    { new: true }
  ).lean();
  if (!doc) throw errors.notFound(ERROR_CODES.INVENTORY_LOCATION_NOT_FOUND, 'Location not found');
  return doc;
}

export async function softDeleteLocation(id) {
  const _id = new mongoose.Types.ObjectId(id);
  const res = await Location.updateOne(
    { _id, deletedAt: null },
    { $set: { deletedAt: new Date(), active: false } }
  );
  if (!res.matchedCount) throw errors.notFound(ERROR_CODES.INVENTORY_LOCATION_NOT_FOUND, 'Location not found');
  return { deleted: true };
}

export async function getLocationById(id, { includeDeleted = false } = {}) {
  if (!id) return null;
  const _id = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  const filter = { _id };
  if (!includeDeleted) filter.deletedAt = null;
  return Location.findOne(filter).lean();
}

export async function restoreLocation(id) {
  const _id = new mongoose.Types.ObjectId(id);
  const doc = await Location.findOneAndUpdate(
    { _id },
    { $set: { deletedAt: null, active: true } },
    { new: true }
  ).lean();
  if (!doc) throw errors.notFound(ERROR_CODES.INVENTORY_LOCATION_NOT_FOUND, 'Location not found');
  return doc;
}

export async function ensureDefaultLocation() {
  const existing = await Location.findOne({ deletedAt: null }).lean();
  if (existing) return existing;
  const fallbackCode = 'DEFAULT';
  const name = 'Default Warehouse';
  const created = await Location.create({ code: fallbackCode, name, type: 'WAREHOUSE', active: true });
  return created.toObject();
}

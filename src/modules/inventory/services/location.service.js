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

export async function listLocations({ type, active, region, country, page = 1, limit = 50 } = {}) {
  const filter = { deletedAt: { $exists: false } };
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
    { _id, deletedAt: { $exists: false } },
    { $set: { ...updates, updatedAt: new Date() } },
    { new: true }
  ).lean();
  if (!doc) throw errors.notFound(ERROR_CODES.RESOURCE_NOT_FOUND, 'Location not found');
  return doc;
}

export async function softDeleteLocation(id) {
  const _id = new mongoose.Types.ObjectId(id);
  const res = await Location.updateOne(
    { _id, deletedAt: { $exists: false } },
    { $set: { deletedAt: new Date(), active: false } }
  );
  if (!res.matchedCount) throw errors.notFound(ERROR_CODES.RESOURCE_NOT_FOUND, 'Location not found');
  return { deleted: true };
}

export async function getLocationById(id) {
  if (!id) return null;
  const _id = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  return Location.findOne({ _id, deletedAt: { $exists: false } }).lean();
}

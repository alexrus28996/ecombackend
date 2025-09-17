import { Address } from './address.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

export async function listAddresses(userId, { type } = {}) {
  const filter = { user: userId };
  if (type) filter.type = type;
  const items = await Address.find(filter).sort({ isDefault: -1, createdAt: -1 });
  return items;
}

export async function getAddress(userId, id) {
  const addr = await Address.findOne({ _id: id, user: userId });
  if (!addr) throw errors.notFound(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Address not found' });
  return addr;
}

export async function createAddress(userId, data) {
  const payload = { ...data, user: userId };
  const addr = await Address.create(payload);
  if (addr.isDefault) {
    await Address.updateMany({ user: userId, type: addr.type, _id: { $ne: addr._id } }, { $set: { isDefault: false } });
  }
  return addr;
}

export async function updateAddress(userId, id, data) {
  const addr = await Address.findOneAndUpdate({ _id: id, user: userId }, data, { new: true });
  if (!addr) throw errors.notFound(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Address not found' });
  if (addr.isDefault) {
    await Address.updateMany({ user: userId, type: addr.type, _id: { $ne: addr._id } }, { $set: { isDefault: false } });
  }
  return addr;
}

export async function deleteAddress(userId, id) {
  const addr = await Address.findOneAndDelete({ _id: id, user: userId });
  if (!addr) throw errors.notFound(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Address not found' });
  return { success: true };
}

export async function setDefaultAddress(userId, id) {
  const addr = await Address.findOne({ _id: id, user: userId });
  if (!addr) throw errors.notFound(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Address not found' });
  await Address.updateMany({ user: userId, type: addr.type, _id: { $ne: addr._id } }, { $set: { isDefault: false } });
  addr.isDefault = true;
  await addr.save();
  return addr;
}


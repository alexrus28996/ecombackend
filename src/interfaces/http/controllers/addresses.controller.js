import { listAddresses as svcList, getAddress as svcGet, createAddress as svcCreate, updateAddress as svcUpdate, deleteAddress as svcDelete, setDefaultAddress as svcSetDefault } from '../../../modules/users/address.service.js';

export async function listAddresses(req, res) {
  const { type } = req.query;
  const items = await svcList(req.user.sub, { type });
  res.json({ items });
}

export async function getAddress(req, res) {
  const item = await svcGet(req.user.sub, req.params.id);
  res.json({ address: item });
}

export async function createAddress(req, res) {
  const item = await svcCreate(req.user.sub, req.validated.body);
  res.status(201).json({ address: item });
}

export async function updateAddress(req, res) {
  const item = await svcUpdate(req.user.sub, req.params.id, req.validated.body);
  res.json({ address: item });
}

export async function deleteAddress(req, res) {
  const out = await svcDelete(req.user.sub, req.params.id);
  res.json(out);
}

export async function setDefault(req, res) {
  const item = await svcSetDefault(req.user.sub, req.params.id);
  res.json({ address: item });
}


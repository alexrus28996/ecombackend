import {
  createTransferOrder,
  transitionTransferOrder,
  listTransferOrders,
  updateTransferOrder,
  getTransferOrderById
} from '../services/stock.service.js';

export async function createTransferOrderController(req, res) {
  const { fromLocationId, toLocationId, lines, metadata } = req.validated?.body ?? req.body;
  const actor = req.user?.sub;
  const doc = await createTransferOrder({ fromLocationId, toLocationId, lines, metadata, actor });
  res.status(201).json({ transfer: doc });
}

export async function transitionTransferOrderController(req, res) {
  const { status } = req.validated?.body ?? req.body;
  const id = req.validated?.params?.id ?? req.params.id;
  const actor = req.user?.sub;
  const doc = await transitionTransferOrder({ id, nextStatus: status, actor });
  res.json({ transfer: doc });
}

export async function listTransferOrdersController(req, res) {
  const { status, fromLocationId, toLocationId, page, limit, from, to } = req.validated?.query ?? req.query;
  const result = await listTransferOrders({ status, fromLocationId, toLocationId, page, limit, from, to });
  res.json(result);
}

export async function updateTransferOrderController(req, res) {
  const { fromLocationId, toLocationId, lines, metadata } = req.validated?.body ?? req.body;
  const id = req.validated?.params?.id ?? req.params.id;
  const doc = await updateTransferOrder({ id, fromLocationId, toLocationId, lines, metadata });
  res.json({ transfer: doc });
}

export async function getTransferOrderController(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const transfer = await getTransferOrderById(id);
  res.json({ transfer });
}

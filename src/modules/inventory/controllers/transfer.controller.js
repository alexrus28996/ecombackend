import { createTransferOrder, transitionTransferOrder, listTransferOrders } from '../services/stock.service.js';

export async function createTransferOrderController(req, res) {
  const { fromLocationId, toLocationId, lines, metadata } = req.body;
  const actor = req.user?.sub;
  const doc = await createTransferOrder({ fromLocationId, toLocationId, lines, metadata, actor });
  res.status(201).json(doc);
}

export async function transitionTransferOrderController(req, res) {
  const { status } = req.body;
  const actor = req.user?.sub;
  const doc = await transitionTransferOrder({ id: req.params.id, nextStatus: status, actor });
  res.json(doc);
}

export async function listTransferOrdersController(req, res) {
  const { status, fromLocationId, toLocationId, page, limit } = req.query;
  const result = await listTransferOrders({ status, fromLocationId, toLocationId, page, limit });
  res.json(result);
}

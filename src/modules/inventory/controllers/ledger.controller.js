import { listStockLedgerEntries, getStockLedgerEntry } from '../services/stock.service.js';

export async function listLedgerController(req, res) {
  const { productId, variantId, locationId, direction, from, to, page, limit } = req.validated?.query ?? req.query;
  const result = await listStockLedgerEntries({ productId, variantId, locationId, direction, from, to, page, limit });
  res.json(result);
}

export async function getLedgerEntryController(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const entry = await getStockLedgerEntry(id);
  res.json({ entry });
}

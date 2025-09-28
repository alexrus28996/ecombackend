import { listPaymentEvents as svcList, getPaymentEvent as svcGet } from '../../../modules/payments/payment-event.service.js';

export async function listPaymentEvents(req, res) {
  const { provider, type, from, to, page, limit } = req.validated?.query ?? req.query;
  const result = await svcList({ provider, type, from, to, page, limit });
  res.json(result);
}

export async function getPaymentEvent(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const event = await svcGet(id);
  res.json({ event });
}

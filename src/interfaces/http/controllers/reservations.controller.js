import { listReservations as listReservationsService, releaseOrderReservations } from '../../../modules/inventory/reservation.service.js';

/**
 * List reservation records with pagination for admin dashboards.
 */
export async function listReservations(req, res) {
  const { orderId, productId, status, page, limit } = req.query;
  const result = await listReservationsService({ orderId, productId, status, page, limit });
  res.json(result);
}

/**
 * Release all active reservations for a specific order on demand.
 */
export async function releaseReservationsForOrder(req, res) {
  const { orderId } = req.validated.params;
  const reason = req.validated?.body?.reason || 'cancelled';
  const notes = req.validated?.body?.notes || `manual:${req.user.sub}`;
  const released = await releaseOrderReservations(orderId, { reason, notes });
  res.json({ released });
}

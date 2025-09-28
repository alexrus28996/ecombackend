import { listAuditLogs as svcList, getAuditLog as svcGet } from '../../../modules/audit/audit.service.js';

export async function listAuditLogs(req, res) {
  const { user, method, status, from, to, path, page, limit } = req.query;
  const result = await svcList({ user, method, status, from, to, path, page, limit });
  res.json(result);
}

export async function getAuditLog(req, res) {
  const log = await svcGet(req.params.id);
  res.json({ log });
}

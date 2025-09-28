import mongoose from 'mongoose';
import { AuditLog } from './audit.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

const SENSITIVE_PATTERNS = [
  /authorization/i,
  /password/i,
  /token/i,
  /secret/i,
  /card/i,
  /cvc/i,
  /cvv/i
];

function redactValue(value, keyPath = '') {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, keyPath));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      const shouldRedact = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
      if (shouldRedact) {
        out[key] = '[REDACTED]';
        continue;
      }
      out[key] = redactValue(entry, key ? `${keyPath}.${key}` : keyPath);
    }
    return out;
  }
  return value;
}

function mapLog(doc) {
  const log = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return {
    ...log,
    query: redactValue(log.query),
    params: redactValue(log.params),
    body: redactValue(log.body),
    meta: redactValue(log.meta)
  };
}

function normalizePagination(limit = 50, page = 1) {
  const l = Math.max(1, Math.min(200, Number(limit) || 50));
  const p = Math.max(1, Number(page) || 1);
  return { limit: l, page: p };
}

export async function listAuditLogs({
  user,
  method,
  status,
  from,
  to,
  path,
  page,
  limit
} = {}) {
  const filter = {};
  if (user) {
    if (!mongoose.Types.ObjectId.isValid(user)) {
      throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { message: 'Invalid user filter' });
    }
    filter.user = new mongoose.Types.ObjectId(user);
  }
  if (method) filter.method = method.toUpperCase();
  if (status) filter.status = Number(status);
  if (path) filter.path = { $regex: path, $options: 'i' };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const { limit: l, page: p } = normalizePagination(limit, page);
  const skip = (p - 1) * l;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    AuditLog.countDocuments(filter)
  ]);
  const sanitized = items.map(mapLog);
  return { items: sanitized, total, page: p, pages: Math.ceil(total / l) || 1 };
}

export async function getAuditLog(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw errors.notFound(ERROR_CODES.AUDIT_LOG_NOT_FOUND, 'Audit log not found');
  }
  const log = await AuditLog.findById(id).lean();
  if (!log) throw errors.notFound(ERROR_CODES.AUDIT_LOG_NOT_FOUND, 'Audit log not found');
  return mapLog(log);
}

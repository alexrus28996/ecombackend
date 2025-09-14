import { AuditLog } from '../modules/audit/audit.model.js';
import { config } from '../config/index.js';

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const redactions = new Set(['password', 'newPassword', 'currentPassword', 'token', 'refreshToken', 'jwt', 'secret']);
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (redactions.has(k)) { out[k] = '[REDACTED]'; continue; }
    if (v && typeof v === 'object') out[k] = sanitize(v);
    else out[k] = v;
  }
  return out;
}

/**
 * Audit middleware: logs admin write actions to MongoDB.
 */
export function auditAdminWrites(req, res, next) {
  const start = Date.now();
  const isWrite = ['POST','PUT','PATCH','DELETE'].includes(req.method);
  const adminPath = String(req.originalUrl || req.url || '').startsWith(`${config.API_PREFIX}/admin`);
  if (!isWrite || !adminPath) return next();

  const bodySnapshot = sanitize(req.body);
  const querySnapshot = sanitize(req.query);
  const paramsSnapshot = sanitize(req.params);

  res.on('finish', async () => {
    try {
      await AuditLog.create({
        user: req.user?.sub || undefined,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ip: req.ip,
        requestId: req.id,
        query: querySnapshot,
        params: paramsSnapshot,
        body: bodySnapshot,
        meta: { durationMs: Date.now() - start }
      });
    } catch (err) {
      // swallow errors; auditing must not break requests
    }
  });
  next();
}


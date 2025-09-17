import { IdempotencyKey } from '../modules/ops/idempotency-key.model.js';

/**
 * Simple idempotency middleware: if a header `Idempotency-Key` is provided,
 * attempts to reserve it for the current user+method+path. If duplicate, responds 409.
 */
export async function idempotency(req, res, next) {
  const key = req.header('Idempotency-Key') || req.header('X-Idempotency-Key');
  if (!key) return next();
  try {
    await IdempotencyKey.create({ key, method: req.method, path: req.originalUrl, user: req.user?.sub });
    return next();
  } catch (e) {
    // Duplicate key -> 409 Conflict
    if (e?.code === 11000) {
      return res.status(409).json({ error: { message: 'Duplicate request', code: 'IDEMPOTENT_REPLAY' } });
    }
    return next(e);
  }
}


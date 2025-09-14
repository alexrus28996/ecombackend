/**
 * Simple HTTP error container used across the app.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

import { ERROR_CODES } from '../errors/codes.js';
import { MESSAGES, format } from '../errors/messages.js';

/**
 * Express 404 handler for unmatched routes.
 */
export function notFound(req, res, next) {
  const message = format(MESSAGES[ERROR_CODES.ROUTE_NOT_FOUND], { method: req.method, path: req.originalUrl });
  const err = new HttpError(404, message);
  err.code = ERROR_CODES.ROUTE_NOT_FOUND;
  next(err);
}

/**
 * Central error handler that returns a consistent JSON payload.
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    error: {
      name: err.name || 'Error',
      message: err.message || 'Internal Server Error'
    }
  };
  if (err.code) payload.error.code = err.code;
  if (err.details) payload.error.details = err.details;
  if (req.app.get('env') !== 'production' && err.stack) payload.error.stack = err.stack;

  // avoid headers already sent
  if (res.headersSent) return next(err);
  res.status(status).json(payload);
}

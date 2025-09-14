import { HttpError } from '../middleware/errors.js';
import { ERROR_CODES } from './codes.js';
import { MESSAGES, format } from './messages.js';

export { ERROR_CODES } from './codes.js';

/**
 * Resolve a human-readable message for a given error code.
 * @param {string} code
 * @param {Record<string, any>=} params
 */
export function messageFor(code, params) {
  return format(MESSAGES[code] || 'Error', params);
}

/**
 * Construct an HttpError with a standardized shape and code.
 */
export function makeError(status, code, params, details) {
  const err = new HttpError(status, messageFor(code, params), details);
  err.code = code;
  err.params = params;
  return err;
}

/**
 * Helper factory to create typed HttpErrors by HTTP status.
 */
export const errors = Object.freeze({
  badRequest: (code, params, details) => makeError(400, code, params, details),
  unauthorized: (code, params, details) => makeError(401, code, params, details),
  forbidden: (code, params, details) => makeError(403, code, params, details),
  notFound: (code, params, details) => makeError(404, code, params, details),
  conflict: (code, params, details) => makeError(409, code, params, details),
  unprocessable: (code, params, details) => makeError(422, code, params, details),
  internal: (code, params, details) => makeError(500, code, params, details)
});

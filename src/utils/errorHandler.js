import mongoose from 'mongoose';
import { HttpError } from '../middleware/errors.js';

/**
 * Normalize different error types into HttpError instances so they are processed
 * by the centralized middleware consistently.
 *
 * @param {unknown} err
 * @returns {HttpError}
 */
export function normalizeError(err) {
  if (err instanceof HttpError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    return new HttpError(400, 'Validation error', details);
  }

  if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const field = fields[0];
    const duplicateMessages = {
      sku: 'SKU must be unique',
      slug: 'Category slug already exists',
      name: 'Category name already exists'
    };
    const fieldMsg = duplicateMessages[field] || (fields.length ? `Duplicate value for ${fields.join(', ')}` : 'Duplicate value');
    return new HttpError(409, fieldMsg);
  }

  return new HttpError(500, 'Internal Server Error');
}

export { HttpError } from '../middleware/errors.js';

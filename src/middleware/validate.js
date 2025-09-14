/**
 * Simple request validator wrapper; supports Zod/Joi-like schemas.
 * Populates req.validated = { body, params, query } on success.
 */
import { errors, ERROR_CODES } from '../errors/index.js';
export function validate(schema) {
  return (req, res, next) => {
    try {
      const body = schema.body ? schema.body.parse ? schema.body.parse(req.body) : schema.body.validate(req.body) : req.body;
      const params = schema.params ? schema.params.parse ? schema.params.parse(req.params) : schema.params.validate(req.params) : req.params;
      const query = schema.query ? schema.query.parse ? schema.query.parse(req.query) : schema.query.validate(req.query) : req.query;
      req.validated = { body, params, query };
      next();
    } catch (err) {
      const details = err?.issues || err?.details || err?.message;
      next(errors.badRequest(ERROR_CODES.VALIDATION_ERROR, undefined, details));
    }
  };
}

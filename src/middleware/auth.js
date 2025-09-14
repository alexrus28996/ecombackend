import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { errors, ERROR_CODES } from '../errors/index.js';

/**
 * Require a valid Bearer token; attaches decoded payload to req.user.
 */
export function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return next(errors.unauthorized(ERROR_CODES.AUTH_HEADER_MISSING));
  }
  const token = auth.substring(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = payload; // { sub, roles, email, name }
    next();
  } catch (err) {
    next(errors.unauthorized(ERROR_CODES.TOKEN_INVALID));
  }
}

/**
 * Enforce a specific role to access a route.
 * @param {string} role
 */
export function requireRole(role) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (!roles.includes(role)) return next(errors.forbidden(ERROR_CODES.FORBIDDEN));
    next();
  };
}

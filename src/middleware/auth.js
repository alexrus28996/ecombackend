import { verifyAccessToken } from '../utils/jwt.js';
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
    const payload = verifyAccessToken(token);
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

/**
 * Require that the user has at least one of the given roles.
 * @param {string[]} rolesAny
 */
export function requireAnyRole(rolesAny) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (!rolesAny.some((r) => roles.includes(r))) return next(errors.forbidden(ERROR_CODES.FORBIDDEN));
    next();
  };
}

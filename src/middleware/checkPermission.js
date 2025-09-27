/**
 * Ensure the authenticated user has the required permission.
 * Designed to work alongside JWT authentication.
 *
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
import { ROLES } from '../config/constants.js';

const checkPermission = (permission) => (req, res, next) => {
  const roles = req.user?.roles || [];
  if (roles.includes(ROLES.ADMIN)) return next();
  if (!req.user?.permissions?.includes(permission)) {
    return res.status(403).json({ error: `Forbidden: Missing permission ${permission}` });
  }
  next();
};

export default checkPermission;

/**
 * Ensure the authenticated user has the required permission.
 * Designed to work alongside JWT authentication.
 *
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
const checkPermission = (permission) => (req, res, next) => {
  if (!req.user?.permissions?.includes(permission)) {
    return res.status(403).json({ error: `Forbidden: Missing permission ${permission}` });
  }
  next();
};

export default checkPermission;

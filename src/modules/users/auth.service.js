import jwt from 'jsonwebtoken';
import { User } from './user.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { ROLES } from '../../config/constants.js';

/**
 * Create a new user and return a public profile.
 * @param {{ name: string, email: string, password: string }} payload
 */
export async function register({ name, email, password }) {
  const emailNorm = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: emailNorm });
  if (existing) throw errors.conflict(ERROR_CODES.EMAIL_IN_USE);
  // If there is no admin in the system yet, make the first registered user an admin
  const adminExists = await User.exists({ roles: ROLES.ADMIN });
  const roles = adminExists ? [ROLES.CUSTOMER] : [ROLES.ADMIN];
  const user = await User.create({ name, email: emailNorm, password, roles });
  return toPublicUser(user);
}

/**
 * Verify credentials and return a JWT plus public profile.
 * @param {{ email: string, password: string }} payload
 */
export async function login({ email, password }) {
  const emailNorm = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm }).select('+password');
  if (!user) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const ok = await user.comparePassword(password);
  if (!ok) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const token = createJwt(user);
  return { token, user: toPublicUser(user) };
}

/**
 * Create a short JWT payload for clients.
 * @param {{ _id: any, email: string, name: string, roles: string[] }} user
 */
export function createJwt(user) {
  const payload = { sub: user._id.toString(), email: user.email, name: user.name, roles: user.roles };
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

/**
 * Reduce a user document to a public-safe shape.
 * @param {any} user
 */
export function toPublicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles, isActive: user.isActive };
}

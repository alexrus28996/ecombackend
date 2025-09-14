import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Sign an access token with standard claims.
 * @param {object} payload - Should include sub, email, name, roles
 * @param {string|number=} expiresIn - Optional override
 * @returns {string}
 */
export function signAccessToken(payload, expiresIn = config.JWT_EXPIRES_IN) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
}

/**
 * Verify an access token and return its payload or throw.
 * @param {string} token
 * @returns {object}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

/**
 * Decode (unsafe) a JWT without verification.
 */
export function decodeToken(token) {
  return jwt.decode(token);
}


import crypto from 'crypto';
import { User } from './user.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { config } from '../../config/index.js';
import { ROLES } from '../../config/constants.js';
import { RefreshToken } from './refresh-token.model.js';
import { PasswordResetToken } from './password-reset-token.model.js';
import { EmailToken } from './email-token.model.js';
import { deliverEmail } from '../../utils/mailer.js';
import { signAccessToken } from '../../utils/jwt.js';
import { getLogger } from '../../logger.js';

const logger = getLogger().child({ module: 'auth-service' });

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
  // Check lock
  if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
    throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  }
  const ok = await user.comparePassword(password);
  if (!ok) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= (config.MAX_LOGIN_ATTEMPTS || 5)) {
      user.lockUntil = new Date(Date.now() + (config.LOCK_TIME_MS || 15 * 60 * 1000));
      user.failedLoginAttempts = 0;
    }
    try {
      await user.save();
    } catch (err) {
      logger.error({ err, userId: String(user._id) }, 'failed to persist failed login attempt state');
    }
    throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  }
  // Success → reset counters
  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    try {
      await user.save();
    } catch (err) {
      logger.warn({ err, userId: String(user._id) }, 'failed to reset login counters after successful authentication');
    }
  }
  const token = createJwt(user);
  const refreshToken = await createRefreshToken(user, { ip: undefined });
  return { token, refreshToken, user: toPublicUser(user) };
}

/**
 * Create a short JWT payload for clients.
 * @param {{ _id: any, email: string, name: string, roles: string[] }} user
 */
export function createJwt(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    roles: user.roles,
    permissions: user.permissions || []
  };
  return signAccessToken(payload);
}

/**
 * Create and persist a refresh token; returns raw token string.
 */
export async function createRefreshToken(user, { ip }) {
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + parseExpiryMs(config.REFRESH_TOKEN_EXPIRES_IN));
  await RefreshToken.create({ user: user._id, tokenHash, createdByIp: ip, expiresAt });
  return raw;
}

/** Rotate a refresh token and return new access/refresh pair */
export async function rotateRefreshToken(rawToken, { ip }) {
  const existing = await findActiveRefreshToken(rawToken);
  const user = await User.findById(existing.user);
  if (!user) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const newRaw = await createRefreshToken(user, { ip });
  existing.revokedAt = new Date();
  existing.revokedByIp = ip;
  existing.replacedByToken = newRaw;
  await existing.save();
  const token = createJwt(user);
  return { token, refreshToken: newRaw, user: toPublicUser(user) };
}

/** Revoke a refresh token */
export async function revokeRefreshToken(rawToken, { ip }) {
  const existing = await findActiveRefreshToken(rawToken);
  existing.revokedAt = new Date();
  existing.revokedByIp = ip;
  await existing.save();
  return { success: true };
}

async function findActiveRefreshToken(rawToken) {
  if (!rawToken) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const rt = await RefreshToken.findOne({ tokenHash });
  if (!rt || !rt.isActive) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  return rt;
}

function parseExpiryMs(s) {
  if (!s) return 0;
  const m = String(s).match(/^(\d+)([smhd])$/);
  if (!m) return Number(s) || 0;
  const n = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return n;
  }
}

/**
 * Request a password reset link; creates a token and "sends" email.
 */
export async function requestPasswordReset(email, { baseUrl } = {}) {
  const emailNorm = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm });
  // Return success even if user not found to avoid enumeration
  if (!user) return { success: true };
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + parseExpiryMs(config.PASSWORD_RESET_EXPIRES_IN));
  await PasswordResetToken.create({ user: user._id, tokenHash, expiresAt });
  const link = `${baseUrl || ''}/reset-password?token=${raw}`;
  await deliverEmail({ to: user.email, subject: 'Password reset', text: `Reset your password: ${link}`, html: `Reset your password: <a href="${link}">${link}</a>` });
  return { success: true };
}

/**
 * Reset password with a token and new password.
 */
export async function resetPassword(rawToken, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const rec = await PasswordResetToken.findOne({ tokenHash });
  if (!rec || !rec.isActive) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const user = await User.findById(rec.user).select('+password');
  if (!user) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  user.password = newPassword;
  await user.save();
  rec.usedAt = new Date();
  await rec.save();
  // Optionally, revoke all refresh tokens for this user
  await RefreshToken.updateMany({ user: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedByIp: 'password-reset' } });
  return { success: true };
}

/**
 * Reduce a user document to a public-safe shape.
 * @param {any} user
 */
export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions || [],
    isActive: user.isActive,
    isVerified: !!user.isVerified
  };
}

/**
 * Email verification: request verification for current email.
 */
export async function requestEmailVerification(userId, { baseUrl } = {}) {
  const user = await User.findById(userId);
  if (!user) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  if (user.isVerified) return { success: true };
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + parseExpiryMs('24h'));
  await EmailToken.create({ user: user._id, tokenHash, expiresAt });
  const link = `${baseUrl || ''}/verify-email?token=${raw}`;
  await deliverEmail({ to: user.email, subject: 'Verify your email', text: `Click to verify: ${link}`, html: `Click to verify: <a href="${link}">${link}</a>` });
  return { success: true };
}

/**
 * Email verification: request email change and verification.
 */
export async function requestEmailChange(userId, newEmail, { baseUrl } = {}) {
  const user = await User.findById(userId);
  if (!user) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const emailNorm = String(newEmail).trim().toLowerCase();
  const exists = await User.findOne({ email: emailNorm });
  if (exists) throw errors.conflict(ERROR_CODES.EMAIL_IN_USE);
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + parseExpiryMs('24h'));
  await EmailToken.create({ user: user._id, tokenHash, newEmail: emailNorm, expiresAt });
  const link = `${baseUrl || ''}/verify-email?token=${raw}`;
  await deliverEmail({ to: emailNorm, subject: 'Confirm your new email', text: `Click to confirm email change: ${link}`, html: `Click to confirm email change: <a href="${link}">${link}</a>` });
  return { success: true };
}

/**
 * Verify email token (verify current email or apply change).
 */
export async function verifyEmailToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const rec = await EmailToken.findOne({ tokenHash });
  if (!rec || !rec.isActive) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  const user = await User.findById(rec.user);
  if (!user) throw errors.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
  if (rec.newEmail) user.email = rec.newEmail;
  user.isVerified = true;
  await user.save();
  rec.usedAt = new Date();
  await rec.save();
  return { success: true };
}

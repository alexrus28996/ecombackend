import { register as svcRegister, login as svcLogin, toPublicUser, rotateRefreshToken, revokeRefreshToken, requestPasswordReset, resetPassword, requestEmailVerification, verifyEmailToken, requestEmailChange } from '../../../modules/users/auth.service.js';
import { User } from '../../../modules/users/user.model.js';

export async function register(req, res) {
  const user = await svcRegister(req.validated.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { token, refreshToken, user } = await svcLogin(req.validated.body);
  res.json({ token, refreshToken, user });
}

export async function me(req, res) {
  res.json({ user: toPublicUser({ _id: req.user.sub, name: req.user.name, email: req.user.email, roles: req.user.roles, isActive: true, isVerified: req.user.isVerified }) });
}

export async function refresh(req, res) {
  const ip = req.ip;
  const { token, refreshToken, user } = await rotateRefreshToken(req.validated.body.refreshToken, { ip });
  res.json({ token, refreshToken, user });
}

export async function logout(req, res) {
  const ip = req.ip;
  await revokeRefreshToken(req.validated.body.refreshToken, { ip });
  res.json({ success: true });
}

export async function forgotPassword(req, res) {
  await requestPasswordReset(req.validated.body.email, { baseUrl: req.validated.body.baseUrl });
  res.json({ success: true });
}

export async function doResetPassword(req, res) {
  await resetPassword(req.validated.body.token, req.validated.body.password);
  res.json({ success: true });
}

export async function getPreferences(req, res) {
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  res.json({ preferences: user.preferences || { locale: 'en', notifications: { email: true, sms: false, push: true } } });
}

export async function updatePreferences(req, res) {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  user.preferences = user.preferences || { locale: 'en', notifications: { email: true, sms: false, push: true } };
  if (req.validated.body.locale) user.preferences.locale = req.validated.body.locale;
  if (req.validated.body.notifications) {
    user.preferences.notifications = { ...user.preferences.notifications, ...req.validated.body.notifications };
  }
  await user.save();
  res.json({ preferences: user.preferences });
}

export async function requestVerify(req, res) {
  await requestEmailVerification(req.user.sub, { baseUrl: req.validated.body.baseUrl });
  res.json({ success: true });
}

export async function verifyEmail(req, res) {
  await verifyEmailToken(req.validated.body.token);
  res.json({ success: true });
}

export async function requestEmailChangeController(req, res) {
  await requestEmailChange(req.user.sub, req.validated.body.newEmail, { baseUrl: req.validated.body.baseUrl });
  res.json({ success: true });
}

export async function updateProfile(req, res) {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  user.name = req.validated.body.name;
  await user.save();
  res.json({ user: toPublicUser(user) });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user.sub).select('+password');
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  const ok = await user.comparePassword(req.validated.body.currentPassword);
  if (!ok) return res.status(401).json({ error: { message: 'Invalid current password' } });
  user.password = req.validated.body.newPassword;
  await user.save();
  res.json({ success: true });
}

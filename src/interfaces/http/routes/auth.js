import { Router } from 'express';
import {
  register as registerController,
  login as loginController,
  me as meController,
  refresh as refreshController,
  logout as logoutController,
  forgotPassword as forgotPasswordController,
  doResetPassword as resetPasswordController,
  updateProfile as updateProfileController,
  changePassword as changePasswordController,
  requestVerify as requestVerifyController,
  verifyEmail as verifyEmailController,
  requestEmailChangeController,
  getPreferences as getPreferencesController,
  updatePreferences as updatePreferencesController
} from '../controllers/auth.controller.js';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotSchema,
  resetSchema,
  updateProfileSchema,
  changePasswordSchema,
  emailReqSchema,
  emailVerifySchema,
  emailChangeSchema,
  prefsSchema
} from '../validation/auth.validation.js';

/**
 * Authentication routes: register, login, and current user.
 */
export const router = Router();

// Create a new user account
router.post('/register', validate(registerSchema), registerController);

// Authenticate and return JWT + profile
router.post('/login', validate(loginSchema), loginController);

// Return current user from JWT
router.get('/me', authRequired, meController);

// Refresh access token using a refresh token
router.post('/refresh', validate(refreshSchema), refreshController);

// Logout: revoke the provided refresh token
router.post('/logout', validate(refreshSchema), logoutController);

// Password reset request
router.post('/password/forgot', validate(forgotSchema), forgotPasswordController);

// Password reset confirm
router.post('/password/reset', validate(resetSchema), resetPasswordController);

// Update my profile (currently supports name only)
router.patch('/profile', authRequired, validate(updateProfileSchema), updateProfileController);

// Change my password
router.post('/password/change', authRequired, validate(changePasswordSchema), changePasswordController);

// Email verification: request link to current email
router.post('/email/verify/request', authRequired, validate(emailReqSchema), requestVerifyController);

// Email verification: apply token (verify or change)
router.post('/email/verify', validate(emailVerifySchema), verifyEmailController);

// Email change request
router.post('/email/change/request', authRequired, validate(emailChangeSchema), requestEmailChangeController);

// Preferences: get current user's preferences
router.get('/preferences', authRequired, getPreferencesController);

// Preferences: update current user's preferences
router.patch('/preferences', authRequired, validate(prefsSchema), updatePreferencesController);

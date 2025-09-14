import { Router } from 'express';
import { z } from 'zod';
import { register, login, toPublicUser } from '../../../modules/users/auth.service.js';
import { authRequired } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';

/**
 * Authentication routes: register, login, and current user.
 */
export const router = Router();

// Validation schemas
const registerSchema = {
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6)
  })
};

// Create a new user account
router.post('/register', validate(registerSchema), async (req, res) => {
  const user = await register(req.validated.body);
  res.status(201).json({ user });
});

const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
};

// Authenticate and return JWT + profile
router.post('/login', validate(loginSchema), async (req, res) => {
  const { token, user } = await login(req.validated.body);
  res.json({ token, user });
});

// Return current user from JWT
router.get('/me', authRequired, async (req, res) => {
  // req.user was set by auth middleware
  res.json({ user: toPublicUser({ _id: req.user.sub, name: req.user.name, email: req.user.email, roles: req.user.roles, isActive: true }) });
});

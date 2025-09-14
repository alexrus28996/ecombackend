import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import { User } from '../../../modules/users/user.model.js';

/**
 * Admin management routes: promote/demote users.
 */
export const router = Router();

const idParam = { params: z.object({ id: z.string().min(1) }) };

// Promote a user to admin (id is the user id)
router.post('/users/:id/promote', authRequired, requireRole(ROLES.ADMIN), validate(idParam), async (req, res) => {
  const { id } = req.validated.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  if (!Array.isArray(user.roles)) user.roles = [];
  if (!user.roles.includes(ROLES.ADMIN)) user.roles.push(ROLES.ADMIN);
  await user.save();
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles } });
}); 

// Remove admin role from a user
router.post('/users/:id/demote', authRequired, requireRole(ROLES.ADMIN), validate(idParam), async (req, res) => {
  const { id } = req.validated.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  user.roles = (user.roles || []).filter((r) => r !== ROLES.ADMIN);
  if (user.roles.length === 0) user.roles = [ROLES.CUSTOMER];
  await user.save();
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles } });
});


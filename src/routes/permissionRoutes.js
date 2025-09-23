import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/me', authRequired, (req, res) => {
  res.json({ userId: req.user.sub, permissions: req.user.permissions || [] });
});

export const permissionRouter = router;

import { Router } from 'express';
import { router as auth } from './auth.js';
import { router as products } from './products.js';
import { router as cart } from './cart.js';
import { router as orders } from './orders.js';
import { router as admin } from './admin.js';

/**
 * API router aggregator. Mounts domain routers under their prefixes.
 */
export const router = Router();

router.use('/auth', auth);
router.use('/products', products);
router.use('/cart', cart);
router.use('/orders', orders);
router.use('/admin', admin);

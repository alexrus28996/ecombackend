import { Router } from 'express';
import { router as auth } from './auth.js';
import { router as products } from './products.js';
import { router as cart } from './cart.js';
import { router as orders } from './orders.js';
import { router as admin } from './admin.js';
import { router as categories } from './categories.js';
import { router as reviews } from './reviews.js';
import { router as brands } from './brands.js';
import { router as payments } from './payments.js';
import { router as uploads } from './uploads.js';
import { router as addresses } from './addresses.js';
import { router as reservations } from './reservations.js';

/**
 * API router aggregator. Mounts domain routers under their prefixes.
 */
export const router = Router();

router.use('/auth', auth);
router.use('/products', products);
router.use('/cart', cart);
router.use('/orders', orders);
router.use('/admin', admin);
router.use('/categories', categories);
router.use('/products/:productId/reviews', reviews);
router.use('/payments', payments);
router.use('/uploads', uploads);
router.use('/addresses', addresses);
router.use('/brands', brands);
router.use('/admin/reservations', reservations);

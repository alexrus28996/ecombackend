import { Router } from 'express';
import { authRequired, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { ROLES } from '../../../config/constants.js';
import {
  listReviews as listReviewsController,
  upsertReview as upsertReviewController,
  deleteReview as deleteReviewController,
  approveReview as approveReviewController,
  hideReview as hideReviewController
} from '../controllers/reviews.controller.js';
import { upsertSchema } from '../validation/reviews.validation.js';

export const router = Router({ mergeParams: true });

// List approved reviews for a product
router.get('/', listReviewsController);

// Create or update current user's review
router.post('/', authRequired, validate(upsertSchema), upsertReviewController);

// Delete a review (author or admin)
router.delete('/:reviewId', authRequired, deleteReviewController);

// Admin moderation
router.post('/:reviewId/approve', authRequired, requireRole(ROLES.ADMIN), approveReviewController);
router.post('/:reviewId/hide', authRequired, requireRole(ROLES.ADMIN), hideReviewController);

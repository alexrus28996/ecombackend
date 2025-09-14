import { listProductReviews as svcList, upsertReview as svcUpsert, deleteReview as svcDelete, moderateReview as svcModerate } from '../../../modules/reviews/review.service.js';
import { ROLES } from '../../../config/constants.js';

export async function listReviews(req, res) {
  const { page, limit } = req.query;
  const result = await svcList(req.params.productId, { page, limit, includeUnapproved: false });
  res.json(result);
}

export async function upsertReview(req, res) {
  const review = await svcUpsert(req.params.productId, req.user.sub, req.validated.body);
  res.status(201).json({ review });
}

export async function deleteReview(req, res) {
  const result = await svcDelete(req.params.productId, req.params.reviewId, { userId: req.user.sub, isAdmin: (req.user.roles || []).includes(ROLES.ADMIN) });
  res.json(result);
}

export async function approveReview(req, res) {
  const review = await svcModerate(req.params.reviewId, { approve: true });
  res.json({ review });
}

export async function hideReview(req, res) {
  const review = await svcModerate(req.params.reviewId, { approve: false });
  res.json({ review });
}


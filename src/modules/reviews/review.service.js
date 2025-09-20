import { Review } from './review.model.js';
import { Product } from '../catalog/product.model.js';
import { errors, ERROR_CODES } from '../../errors/index.js';
import { t } from '../../i18n/index.js';
import { Order } from '../orders/order.model.js';

export async function listProductReviews(productId, { limit = 20, page = 1, includeUnapproved = false } = {}) {
  const filter = { product: productId };
  if (!includeUnapproved) filter.isApproved = true;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Review.countDocuments(filter)
  ]);
  return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit) || 1) };
}

export async function upsertReview(productId, userId, { rating, comment }) {
  const exists = await Product.exists({ _id: productId });
  if (!exists) throw errors.notFound(ERROR_CODES.PRODUCT_NOT_FOUND);
  const review = await Review.findOneAndUpdate(
    { product: productId, user: userId },
    { rating, comment, isApproved: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  try {
    const hasPaidOrder = await Order.exists({ user: userId, 'items.product': productId, paymentStatus: 'paid' });
    if (hasPaidOrder && !review.verifiedPurchase) {
      review.verifiedPurchase = true;
      await review.save();
    }
  } catch {}
  await recomputeProductRating(productId);
  return review;
}

export async function deleteReview(productId, reviewId, { userId, isAdmin }) {
  const review = await Review.findOne({ _id: reviewId, product: productId });
  if (!review) throw errors.notFound(ERROR_CODES.NOT_FOUND || 'NOT_FOUND');
  if (!isAdmin && review.user.toString() !== userId) throw errors.forbidden(ERROR_CODES.FORBIDDEN);
  await Review.deleteOne({ _id: review._id });
  await recomputeProductRating(productId);
  return { success: true };
}

export async function moderateReview(reviewId, { approve }) {
  const review = await Review.findById(reviewId);
  if (!review) throw errors.notFound(ERROR_CODES.NOT_FOUND || 'NOT_FOUND');
  review.isApproved = !!approve;
  await review.save();
  await recomputeProductRating(review.product);
  return review;
}

export async function recomputeProductRating(productId) {
  const agg = await Review.aggregate([
    { $match: { product: Product.castObjectId(productId) ?? productId, isApproved: true } },
    { $group: { _id: '$product', count: { $sum: 1 }, avg: { $avg: '$rating' } } }
  ]);
  const stats = agg[0];
  const count = stats ? stats.count : 0;
  const avg = stats ? Math.round(stats.avg * 10) / 10 : 0;
  await Product.findByIdAndUpdate(productId, { ratingCount: count, ratingAvg: avg });
}

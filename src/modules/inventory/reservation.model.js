import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reservedQty: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'converted'],
      default: 'active',
      index: true
    },
    expiryTimestamp: { type: Date, index: true },
    notes: { type: String },
    releasedAt: { type: Date },
    convertedAt: { type: Date }
  },
  { timestamps: true }
);

reservationSchema.index({ orderId: 1, productId: 1, variantId: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);


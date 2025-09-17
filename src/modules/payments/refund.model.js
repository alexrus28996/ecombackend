import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
    provider: { type: String },
    status: { type: String, enum: ['pending','succeeded','failed'], default: 'pending', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    reason: { type: String },
    providerRef: { type: String },
    raw: {}
  },
  { timestamps: true }
);

refundSchema.index({ order: 1, createdAt: -1 });

export const Refund = mongoose.model('Refund', refundSchema);


import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, required: true },
    status: { type: String, enum: ['pending','succeeded','failed','refunded'], default: 'pending', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    providerRef: { type: String, index: true },
    raw: {}
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ order: 1, createdAt: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);


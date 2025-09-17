import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['requested', 'approved', 'rejected', 'refunded'], default: 'requested' },
    reason: { type: String },
    note: { type: String },
    refund: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    refundedAt: { type: Date }
  },
  { timestamps: true }
);

export const ReturnRequest = mongoose.model('ReturnRequest', returnSchema);

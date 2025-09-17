import mongoose from 'mongoose';

const paymentEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    type: { type: String },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    receivedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

paymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);


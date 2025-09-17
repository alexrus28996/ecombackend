import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant: { type: mongoose.Schema.Types.ObjectId },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['reserved','released','consumed'], default: 'reserved', index: true },
    reason: { type: String }
  },
  { timestamps: true }
);

reservationSchema.index({ order: 1, product: 1, variant: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);


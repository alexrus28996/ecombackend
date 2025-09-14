import mongoose from 'mongoose';

const timelineSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, required: true },
    message: { type: String },
    from: {},
    to: {},
    meta: {}
  },
  { timestamps: true }
);

timelineSchema.index({ order: 1, createdAt: -1 });

export const OrderTimeline = mongoose.model('OrderTimeline', timelineSchema);


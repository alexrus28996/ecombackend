import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    includeCategories: { type: [mongoose.Schema.Types.ObjectId], ref: 'Category', default: [] },
    excludeCategories: { type: [mongoose.Schema.Types.ObjectId], ref: 'Category', default: [] },
    includeProducts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    excludeProducts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    perUserLimit: { type: Number, default: 0 },
    globalLimit: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Coupon = mongoose.model('Coupon', couponSchema);

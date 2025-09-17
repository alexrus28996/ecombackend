import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['shipping', 'billing'], required: true },
    fullName: { type: String },
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String },
    label: { type: String },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Enforce at most one default per user+type
addressSchema.index(
  { user: 1, type: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export const Address = mongoose.model('Address', addressSchema);


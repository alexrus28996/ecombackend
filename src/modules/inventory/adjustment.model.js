import mongoose from 'mongoose';

const adjustmentSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant: { type: mongoose.Schema.Types.ObjectId },
    qtyChange: { type: Number, required: true }, // positive = add, negative = remove
    reason: { type: String, enum: ['manual', 'order', 'refund', 'restock', 'correction'], default: 'manual' },
    note: { type: String },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const InventoryAdjustment = mongoose.model('InventoryAdjustment', adjustmentSchema);


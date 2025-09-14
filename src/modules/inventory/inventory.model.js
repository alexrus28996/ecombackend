import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant: { type: mongoose.Schema.Types.ObjectId, index: true },
    sku: { type: String },
    location: { type: String },
    qty: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

inventorySchema.index({ product: 1, variant: 1, location: 1 }, { unique: true, partialFilterExpression: { product: { $exists: true } } });

export const Inventory = mongoose.model('Inventory', inventorySchema);


import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    onHand: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    incoming: { type: Number, default: 0, min: 0 },
    safetyStock: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 }
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

stockItemSchema.index(
  { productId: 1, variantId: 1, locationId: 1 },
  { unique: true, partialFilterExpression: { productId: { $exists: true }, locationId: { $exists: true } } }
);
stockItemSchema.index({ locationId: 1 });
stockItemSchema.index({ productId: 1, variantId: 1 });

stockItemSchema.virtual('available').get(function availableGetter() {
  return Math.max(0, Number(this.onHand || 0) - Number(this.reserved || 0));
});

export const StockItem = mongoose.model('StockItem', stockItemSchema);

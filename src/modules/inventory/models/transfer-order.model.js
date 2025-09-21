import mongoose from 'mongoose';

const transferLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    qty: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const transferOrderSchema = new mongoose.Schema(
  {
    fromLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    toLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    lines: { type: [transferLineSchema], validate: [(val) => Array.isArray(val) && val.length > 0, 'lines_required'] },
    status: {
      type: String,
      enum: ['DRAFT', 'REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
      default: 'DRAFT'
    },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

transferOrderSchema.index({ status: 1, createdAt: -1 });
transferOrderSchema.index({ fromLocationId: 1, toLocationId: 1, status: 1 });

export const TransferOrder = mongoose.model('TransferOrder', transferOrderSchema);

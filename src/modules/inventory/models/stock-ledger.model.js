import mongoose from 'mongoose';

const stockLedgerSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    qty: { type: Number, required: true },
    direction: {
      type: String,
      required: true,
      enum: ['IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST', 'TRANSFER_IN', 'TRANSFER_OUT']
    },
    reason: {
      type: String,
      enum: [
        'ORDER',
        'PO',
        'ADJUSTMENT',
        'TRANSFER',
        'RETURN',
        'RESERVATION',
        'FULFILLMENT',
        'RECONCILIATION',
        'SYSTEM'
      ],
      default: 'SYSTEM'
    },
    refType: {
      type: String,
      enum: ['ORDER', 'PO', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'RESERVATION'],
      default: 'ORDER'
    },
    refId: { type: String },
    occurredAt: { type: Date, default: () => new Date(), index: true },
    actor: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockLedgerSchema.index({ occurredAt: -1 });
stockLedgerSchema.index({ productId: 1, variantId: 1, locationId: 1, occurredAt: -1 });

export const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);

import mongoose from 'mongoose';

const attributeSelectionSchema = new mongoose.Schema({
  attribute: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductAttribute', required: true },
  option: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductOption', required: true }
}, { _id: false });

const productVariantSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  sku: { type: String, required: true, trim: true },
  combinationKey: { type: String, required: true, index: true },
  selections: { type: [attributeSelectionSchema], default: [] },
  priceOverride: { type: Number, min: 0 },
  priceDelta: { type: Number },
  stock: { type: Number, min: 0, default: 0 },
  barcode: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productVariantSchema.index({ product: 1, sku: 1 }, { unique: true });
productVariantSchema.index({ product: 1, combinationKey: 1 }, { unique: true });

export const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

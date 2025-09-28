import mongoose from 'mongoose';
import slugify from 'slugify';
import { config } from '../../config/index.js';

// Simple image value object for product pictures
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String }
}, { _id: false });

// Shared dimensions value object
const dimensionsSchema = new mongoose.Schema({
  length: { type: Number },
  width: { type: Number },
  height: { type: Number },
  unit: { type: String, default: 'cm' }
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, index: true },
    description: { type: String },
    longDescription: { type: String },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    currency: { type: String, default: () => config.DEFAULT_CURRENCY },
    images: { type: [imageSchema], default: [] },
    attributes: { type: Map, of: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', alias: 'brandId' },
    vendor: { type: String, trim: true },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    mpn: { type: String, trim: true },
    taxClass: { type: String, trim: true },
    tags: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    requiresShipping: { type: Boolean, default: true },
    weight: { type: Number },
    weightUnit: { type: String, default: 'kg' },
    dimensions: { type: dimensionsSchema },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: [String], default: [] },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

/**
 * Auto-generate a URL-friendly slug from the name.
 */
productSchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Helpful indexes for catalog queries
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
productSchema.index({ deletedAt: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

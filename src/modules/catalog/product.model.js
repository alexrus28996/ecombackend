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

// Product schema with slug, attributes map, and stock
const variantSchema = new mongoose.Schema({
  sku: { type: String, trim: true },
  attributes: { type: Map, of: String },
  price: { type: Number, min: 0 },
  priceDelta: { type: Number },
  compareAtPrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },
  barcode: { type: String, trim: true },
  weight: { type: Number },
  weightUnit: { type: String, default: 'kg' },
  dimensions: { type: dimensionsSchema },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String },
    longDescription: { type: String },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    currency: { type: String, default: () => config.DEFAULT_CURRENCY },
    images: { type: [imageSchema], default: [] },
    attributes: { type: Map, of: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    vendor: { type: String, trim: true },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    mpn: { type: String, trim: true },
    taxClass: { type: String, trim: true },
    tags: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    variants: { type: [variantSchema], default: [] },
    requiresShipping: { type: Boolean, default: true },
    weight: { type: Number },
    weightUnit: { type: String, default: 'kg' },
    dimensions: { type: dimensionsSchema },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: [String], default: [] }
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
// slug already has unique constraint on field definition; avoid duplicate index
productSchema.index({ name: 'text', description: 'text' });

export const Product = mongoose.model('Product', productSchema);

import mongoose from 'mongoose';
import slugify from 'slugify';
import { config } from '../../config/index.js';

// Simple image value object for product pictures
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String }
}, { _id: false });

// Product schema with slug, attributes map, and stock
const variantSchema = new mongoose.Schema({
  sku: { type: String, trim: true },
  attributes: { type: Map, of: String },
  price: { type: Number, min: 0 },
  priceDelta: { type: Number },
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: () => config.DEFAULT_CURRENCY },
    images: { type: [imageSchema], default: [] },
    attributes: { type: Map, of: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    variants: { type: [variantSchema], default: [] },
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
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

export const Product = mongoose.model('Product', productSchema);

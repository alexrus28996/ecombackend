import mongoose from 'mongoose';
import slugify from 'slugify';
import { config } from '../../config/index.js';

// Simple image value object for product pictures
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String }
}, { _id: false });

// Product schema with slug, attributes map, and stock
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: () => config.DEFAULT_CURRENCY },
    images: { type: [imageSchema], default: [] },
    attributes: { type: Map, of: String },
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

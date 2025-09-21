import mongoose from 'mongoose';
import slugify from 'slugify';

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    logo: { type: String, trim: true },
    description: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

/**
 * Normalize and guarantee a slug before validation.
 */
brandSchema.pre('validate', function deriveSlug(next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  if (this.slug) {
    this.slug = slugify(this.slug, { lower: true, strict: true });
  }
  next();
});

brandSchema.index({ name: 1 }, { unique: true });
brandSchema.index({ slug: 1 }, { unique: true });

export const Brand = mongoose.model('Brand', brandSchema);


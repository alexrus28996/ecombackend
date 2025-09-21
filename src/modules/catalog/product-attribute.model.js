import mongoose from 'mongoose';
import slugify from 'slugify';

const productAttributeSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  description: { type: String },
  sortOrder: { type: Number, default: 0 },
  isRequired: { type: Boolean, default: true }
}, { timestamps: true });

productAttributeSchema.index({ product: 1, slug: 1 }, { unique: true });
productAttributeSchema.index({ product: 1, name: 1 }, { unique: true });

productAttributeSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  if (this.slug) this.slug = slugify(this.slug, { lower: true, strict: true });
  next();
});

export const ProductAttribute = mongoose.model('ProductAttribute', productAttributeSchema);

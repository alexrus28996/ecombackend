import mongoose from 'mongoose';
import slugify from 'slugify';

const productOptionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  attribute: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductAttribute', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  sortOrder: { type: Number, default: 0 },
  metadata: { type: Map, of: String }
}, { timestamps: true });

productOptionSchema.index({ attribute: 1, slug: 1 }, { unique: true });
productOptionSchema.index({ attribute: 1, name: 1 }, { unique: true });

productOptionSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  if (this.slug) this.slug = slugify(this.slug, { lower: true, strict: true });
  next();
});

export const ProductOption = mongoose.model('ProductOption', productOptionSchema);

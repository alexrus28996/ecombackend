import mongoose from 'mongoose';

// Value object for category images/icons
const catImageSchema = new mongoose.Schema({ url: { type: String }, alt: { type: String } }, { _id: false });

// Category schema for product classification
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
      description: 'String-based lifecycle status for PBAC aware APIs'
    },
    image: { type: catImageSchema },
    banner: { type: catImageSchema },
    icon: { type: String },
    fullSlug: { type: String },
    path: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'Category' },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: [String], default: [] },
    attributes: { type: Map, of: String },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

categorySchema.pre('validate', function syncStatus(next) {
  if (this.isModified('status')) {
    this.isActive = this.status !== 'inactive';
  } else if (this.isModified('isActive')) {
    this.status = this.isActive ? 'active' : 'inactive';
  }
  next();
});

categorySchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
categorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Category = mongoose.model('Category', categorySchema);

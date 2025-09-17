import mongoose from 'mongoose';

// Value object for category images/icons
const catImageSchema = new mongoose.Schema({ url: { type: String }, alt: { type: String } }, { _id: false });

// Category schema for product classification
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
    image: { type: catImageSchema },
    banner: { type: catImageSchema },
    icon: { type: String },
    fullSlug: { type: String },
    path: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'Category' },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: [String], default: [] },
    attributes: { type: Map, of: String }
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);

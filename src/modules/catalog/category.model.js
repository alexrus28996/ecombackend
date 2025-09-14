import mongoose from 'mongoose';

// Category schema for product classification
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    sortOrder: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);

import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Variant schema capturing a concrete combination of product attributes.
 * It is embedded to keep product variants co-located with their parent product.
 */
const VariantSchema = new Schema(
  {
    combination: {
      type: Map,
      of: String,
      default: undefined,
      required: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Variant price must be positive']
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Variant stock cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { _id: true, timestamps: false }
);

/**
 * Product schema storing base level attributes and generated variants.
 */
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be greater than zero']
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    images: {
      type: [String],
      default: []
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    attributes: {
      size: {
        type: [String],
        default: undefined
      },
      color: {
        type: [String],
        default: undefined
      }
    },
    variants: {
      type: [VariantSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

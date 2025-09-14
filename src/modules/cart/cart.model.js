import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { CART_STATUS } from '../../config/constants.js';

// Item snapshot stored in the cart
const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: mongoose.Schema.Types.ObjectId },
  sku: { type: String },
  attributes: { type: Map, of: String },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

// Cart schema holding denormalized items for quick reads
const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    total: { type: Number, default: 0 },
    currency: { type: String, default: () => config.DEFAULT_CURRENCY },
    status: { type: String, enum: Object.values(CART_STATUS), default: CART_STATUS.ACTIVE }
  },
  { timestamps: true }
);

/**
 * Recompute the cart subtotal.
 */
cartSchema.methods.recalculate = function () {
  this.subtotal = this.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  // total to be recomputed by services based on coupon
};

export const Cart = mongoose.model('Cart', cartSchema);

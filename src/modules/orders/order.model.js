import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../config/constants.js';

// Snapshot of ordered item (denormalized)
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

// Postal address structure
const addressSchema = new mongoose.Schema({
  fullName: String,
  line1: String,
  line2: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  phone: String
}, { _id: false });

// Order schema with status and payment tracking
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: () => config.DEFAULT_CURRENCY },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.UNPAID },
    paymentProvider: { type: String },
    transactionId: { type: String },
    paidAt: { type: Date },
    invoiceNumber: { type: String },
    invoiceUrl: { type: String },
    shippingAddress: { type: addressSchema },
    placedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);

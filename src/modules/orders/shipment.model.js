import mongoose from 'mongoose';

const shipmentItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String },
  quantity: { type: Number, min: 1, default: 1 }
}, { _id: false });

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

const shipmentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    address: { type: addressSchema },
    carrier: { type: String },
    service: { type: String },
    tracking: { type: String, index: true },
    status: { type: String, enum: ['pending','shipped','delivered','returned'], default: 'pending' },
    items: { type: [shipmentItemSchema], default: [] }
  },
  { timestamps: true }
);

shipmentSchema.index({ order: 1, createdAt: -1 });

export const Shipment = mongoose.model('Shipment', shipmentSchema);


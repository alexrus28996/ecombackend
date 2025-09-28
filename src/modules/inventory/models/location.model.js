import mongoose from 'mongoose';

const GEO_SCHEMA = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    pincode: { type: String },
    country: { type: String },
    region: { type: String }
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['WAREHOUSE', 'STORE', 'DROPSHIP', 'BUFFER'],
      default: 'WAREHOUSE'
    },
    geo: { type: GEO_SCHEMA, default: () => ({}) },
    priority: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map()
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

locationSchema.index({ code: 1 }, { unique: true, collation: { locale: 'en', strength: 2 }, partialFilterExpression: { deletedAt: null } });
locationSchema.index(
  { 'geo.country': 1, 'geo.region': 1, 'geo.pincode': 1 },
  { unique: true, sparse: true }
);
locationSchema.index({ active: 1, priority: -1 });
locationSchema.index({ deletedAt: 1 });

locationSchema.methods.isDropship = function isDropship() {
  return this.type === 'DROPSHIP';
};

export const Location = mongoose.model('Location', locationSchema);

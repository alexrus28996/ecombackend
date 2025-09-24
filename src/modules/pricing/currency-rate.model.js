import mongoose from 'mongoose';

const currencyRateSchema = new mongoose.Schema(
  {
    baseCurrency: { type: String, required: true, uppercase: true, trim: true },
    currency: { type: String, required: true, uppercase: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    source: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

currencyRateSchema.index({ baseCurrency: 1, currency: 1 }, { unique: true });

export const CurrencyRate = mongoose.model('CurrencyRate', currencyRateSchema);

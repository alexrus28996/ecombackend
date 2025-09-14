import mongoose from 'mongoose';

const emailTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    newEmail: { type: String },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date }
  },
  { timestamps: true }
);

emailTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= new Date(this.expiresAt).getTime();
});

emailTokenSchema.virtual('isActive').get(function () {
  return !this.usedAt && !this.isExpired;
});

export const EmailToken = mongoose.model('EmailToken', emailTokenSchema);


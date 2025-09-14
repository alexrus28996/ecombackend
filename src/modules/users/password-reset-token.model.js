import mongoose from 'mongoose';

const resetTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date }
  },
  { timestamps: true }
);

resetTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= new Date(this.expiresAt).getTime();
});

resetTokenSchema.virtual('isActive').get(function () {
  return !this.usedAt && !this.isExpired;
});

export const PasswordResetToken = mongoose.model('PasswordResetToken', resetTokenSchema);


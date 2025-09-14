import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    createdByIp: { type: String },
    revokedAt: { type: Date },
    revokedByIp: { type: String },
    replacedByToken: { type: String },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

refreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= new Date(this.expiresAt).getTime();
});

refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && !this.isExpired;
});

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);


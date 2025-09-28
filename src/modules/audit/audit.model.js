import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status: { type: Number },
    ip: { type: String },
    requestId: { type: String },
    query: {},
    params: {},
    body: {},
    meta: {}
  },
  { timestamps: true }
);

auditSchema.index({ user: 1, createdAt: -1 });
auditSchema.index({ method: 1, path: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema);


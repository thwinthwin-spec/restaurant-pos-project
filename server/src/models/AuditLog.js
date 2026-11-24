import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String, default: 'system' },
    action: { type: String, required: true, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

auditSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema);

export async function audit(req, action, details = {}) {
  try {
    await AuditLog.create({
      actor: req?.user?.id,
      actorName: req?.user?.name || 'system',
      action,
      details,
      ip: req?.ip || '',
      userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 300),
    });
  } catch (error) {
    console.error('[audit] failed to write audit log:', error.message);
  }
}

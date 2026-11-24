import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Setting, getSettings } from '../models/Setting.js';
import { AuditLog } from '../models/AuditLog.js';
import { audit } from '../models/AuditLog.js';
import { AppError, asyncHandler, escapeRegex, pagination } from '../utils.js';

export const getSettingsController = asyncHandler(async (_req, res) => res.json(await getSettings()));

export const updateSettings = asyncHandler(async (req, res) => {
  const updates = Object.entries(req.validated).map(([key, value]) => ({
    updateOne: { filter: { key }, update: { $set: { value } }, upsert: true },
  }));
  if (updates.length) await Setting.bulkWrite(updates);
  await audit(req, 'settings_updated', { fields: Object.keys(req.validated) });
  res.json(await getSettings());
});

export const listStaff = asyncHandler(async (_req, res) => {
  res.json(await User.find().select('name email role active lastLoginAt createdAt').sort({ createdAt: 1 }).lean());
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.validated;
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role });
  await audit(req, 'staff_created', { email, role });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await User.findById(id);
  if (!target) throw new AppError(404, 'Staff member not found');
  if (target.id === req.user.id && req.validated.active === false) {
    throw new AppError(400, 'You cannot deactivate your own account');
  }
  if (target.role === 'admin' && req.validated.role === 'cashier') {
    const admins = await User.countDocuments({ role: 'admin', active: true });
    if (admins <= 1) throw new AppError(400, 'At least one active administrator is required');
  }

  Object.assign(target, req.validated);
  await target.save();
  await audit(req, 'staff_updated', { id, changes: Object.keys(req.validated) });
  res.json({ id: target.id, name: target.name, email: target.email, role: target.role, active: target.active });
});

export const listAudit = asyncHandler(async (req, res) => {
  const { q } = req.validated;
  const { page, limit, skip } = pagination(req.validated);
  const filter = q ? { $or: [{ action: new RegExp(escapeRegex(q), 'i') }, { actorName: new RegExp(escapeRegex(q), 'i') }] } : {};
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

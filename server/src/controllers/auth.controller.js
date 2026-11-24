import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Setting, DEFAULT_SETTINGS } from '../models/Setting.js';
import { audit } from '../models/AuditLog.js';
import { AppError, asyncHandler } from '../utils.js';
import { clearSession, issueSession } from '../middleware.js';

export const setupStatus = asyncHandler(async (_req, res) => {
  const userCount = await User.countDocuments();
  const taxSetting = await Setting.findOne({ key: 'taxRate' }).lean();
  res.json({
    needsAdmin: userCount === 0,
    taxConfigured: taxSetting != null,
    restaurantName: (await Setting.findOne({ key: 'restaurantName' }).lean())?.value || DEFAULT_SETTINGS.restaurantName,
  });
});

export const setupAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, taxRate, restaurantName } = req.validated;
  if (await User.countDocuments()) throw new AppError(409, 'Initial setup has already been completed');

  const admin = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: 'admin',
  });

  await Setting.bulkWrite([
    { updateOne: { filter: { key: 'taxRate' }, update: { $set: { value: taxRate } }, upsert: true } },
    {
      updateOne: {
        filter: { key: 'restaurantName' },
        update: { $set: { value: restaurantName || DEFAULT_SETTINGS.restaurantName } },
        upsert: true,
      },
    },
  ]);

  await audit(req, 'initial_setup', { email, taxRate });
  issueSession(req, res, admin);
  res.status(201).json({ message: 'Your restaurant is ready.', user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated;
  const user = await User.findOne({ email: email.toLowerCase(), active: true }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, 'Email or password is incorrect');
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await audit(req, 'login', { email: user.email });
  issueSession(req, res, user);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export const logout = asyncHandler(async (req, res) => {
  await audit(req, 'logout', {});
  clearSession(res);
  res.json({ message: 'Signed out' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

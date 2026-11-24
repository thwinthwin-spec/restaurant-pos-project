import { MenuItem } from '../models/MenuItem.js';
import { audit } from '../models/AuditLog.js';
import { AppError, asyncHandler, escapeRegex } from '../utils.js';

export const listMenu = asyncHandler(async (req, res) => {
  const { q, category, all } = req.query;
  const filter = {};
  if (String(all) !== 'true') filter.active = true;
  if (category && category !== 'All') filter.category = category;
  if (q) {
    const pattern = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [{ name: pattern }, { category: pattern }, { description: pattern }];
  }
  const items = await MenuItem.find(filter).sort({ sortOrder: 1, category: 1, name: 1 }).lean();
  res.json(items);
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.create(req.validated);
  await audit(req, 'menu_created', { id: item.id, name: item.name, price: item.price });
  res.status(201).json(item);
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.validated, { new: true, runValidators: true });
  if (!item) throw new AppError(404, 'Menu item not found');
  await audit(req, 'menu_updated', { id: item.id, name: item.name, changes: Object.keys(req.validated) });
  res.json(item);
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError(404, 'Menu item not found');
  await audit(req, 'menu_deleted', { id: item.id, name: item.name });
  res.status(204).end();
});

import { Order } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { Setting } from '../models/Setting.js';
import { audit } from '../models/AuditLog.js';
import { nextOrderNumber } from '../models/Counter.js';
import { AppError, asyncHandler, escapeRegex, pagination, round2 } from '../utils.js';

export const listOrders = asyncHandler(async (req, res) => {
  const { from, to, type, status, paymentMethod, fulfillmentStatus, q } = req.validated;
  const { page, limit, skip } = pagination(req.validated);

  const filter = {};
  if (from || to) {
    filter.createdAt = {
      ...(from && { $gte: new Date(`${from}T00:00:00.000Z`) }),
      ...(to && { $lte: new Date(`${to}T23:59:59.999Z`) }),
    };
  }
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ number: pattern }, { customerName: pattern }, { table: pattern }, { 'items.name': pattern }];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new AppError(404, 'Order not found');
  res.json(order);
});

export const createOrder = asyncHandler(async (req, res) => {
  const input = req.validated;
  const configured = await Setting.findOne({ key: 'taxRate' }).lean();
  if (!configured) throw new AppError(409, 'Set your tax rate in Settings before taking orders');

  const ids = [...new Set(input.items.map((item) => item.menuItem))];
  const docs = await MenuItem.find({ _id: { $in: ids }, active: true }).lean();
  if (docs.length !== ids.length) throw new AppError(400, 'One or more menu items are no longer available');

  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const items = input.items.map((item) => {
    const menu = byId.get(String(item.menuItem));
    return { menuItem: menu._id, name: menu.name, price: menu.price, quantity: item.quantity, note: item.note || '' };
  });

  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const discount = round2(Math.min(input.discount || 0, subtotal));
  const taxRate = Number(configured.value);
  const taxable = round2(subtotal - discount);
  const tax = round2((taxable * taxRate) / 100);
  const total = round2(taxable + tax);
  const amountTendered = input.paymentMethod === 'cash' ? round2(input.amountTendered || 0) : 0;
  const change = input.paymentMethod === 'cash' && amountTendered > total ? round2(amountTendered - total) : 0;

  const order = await Order.create({
    number: await nextOrderNumber(),
    type: input.type,
    table: input.table || '',
    customerName: input.customerName || '',
    notes: input.notes || '',
    items,
    subtotal,
    discount,
    taxRate,
    tax,
    total,
    paymentMethod: input.paymentMethod,
    amountTendered,
    change,
    status: 'pending',
    confirmedAt: null,
    confirmedBy: null,
    confirmedByName: '',
    fulfillmentStatus: 'open',
    cashier: req.user.id,
    cashierName: req.user.name,
  });

  await audit(req, 'order_created', { number: order.number, total: order.total, paymentMethod: order.paymentMethod });
  res.status(201).json(order);
});

/**
 * Admin confirmation is the single point where money enters the sales totals.
 * Reports aggregate by confirmedAt, so a next-day confirmation counts that day.
 */
export const confirmOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.status === 'paid') return res.json(order);
  if (order.status !== 'pending') throw new AppError(409, 'Only pending orders can be confirmed');

  order.status = 'paid';
  order.confirmedAt = new Date();
  order.confirmedBy = req.user.id;
  order.confirmedByName = req.user.name;
  await order.save();

  await audit(req, 'order_confirmed', {
    number: order.number,
    total: order.total,
    paymentMethod: order.paymentMethod,
  });
  res.json(order);
});

export const updateFulfillment = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { fulfillmentStatus: req.validated.status },
    { new: true, runValidators: true },
  );
  if (!order) throw new AppError(404, 'Order not found');
  await audit(req, 'order_status_changed', { number: order.number, status: order.fulfillmentStatus });
  res.json(order);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError(404, 'Order not found');
  if (!['pending', 'paid'].includes(order.status)) {
    throw new AppError(409, 'Only pending or paid orders can be cancelled');
  }
  order.status = 'cancelled';
  order.fulfillmentStatus = 'cancelled';
  await order.save();
  await audit(req, 'order_cancelled', { number: order.number, total: order.total });
  res.json(order);
});

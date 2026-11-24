import { Order } from '../models/Order.js';
import { asyncHandler, dayBounds, round2 } from '../utils.js';

export const getReport = asyncHandler(async (req, res) => {
  const { from, to } = req.validated;
  const { start, end } = dayBounds(from, to);

  // A sale belongs to the day the admin confirmed it, not the day it was placed.
  // Legacy orders without confirmedAt fall back to createdAt.
  const confirmedSales = [
    { $match: { status: 'paid' } },
    { $addFields: { saleDate: { $ifNull: ['$confirmedAt', '$createdAt'] } } },
    { $match: { saleDate: { $gte: start, $lte: end } } },
  ];

  const [summaryRows, methodRows, dishRows, trendRows, hourRows, typeRows, pendingRows] = await Promise.all([
    Order.aggregate([
      ...confirmedSales,
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          discount: { $sum: '$discount' },
          tax: { $sum: '$tax' },
        },
      },
    ]),
    Order.aggregate([
      ...confirmedSales,
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Order.aggregate([
      ...confirmedSales,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
    ]),
    Order.aggregate([
      ...confirmedSales,
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      ...confirmedSales,
      { $group: { _id: { $hour: '$saleDate' }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      ...confirmedSales,
      { $group: { _id: '$type', revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([
      { $match: { status: 'pending', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, amount: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
  ]);

  const { _id, ...totals } = summaryRows[0] || { revenue: 0, count: 0, subtotal: 0, discount: 0, tax: 0 };
  const methodTotal = (method) => round2(methodRows.find((row) => row._id === method)?.total || 0);
  const methodCount = (method) => methodRows.find((row) => row._id === method)?.count || 0;

  res.json({
    range: { from: from || start.toISOString().slice(0, 10), to: to || end.toISOString().slice(0, 10) },
    summary: {
      ...totals,
      cash: methodTotal('cash'),
      kpay: methodTotal('kpay'),
      cashCount: methodCount('cash'),
      kpayCount: methodCount('kpay'),
      average: totals.count ? round2(totals.revenue / totals.count) : 0,
    },
    pending: {
      amount: round2(pendingRows[0]?.amount || 0),
      count: pendingRows[0]?.count || 0,
    },
    methods: methodRows.map((row) => ({ method: row._id, total: round2(row.total), count: row.count })),
    dishes: dishRows.map((row) => ({ name: row._id, quantity: row.quantity, revenue: round2(row.revenue) })),
    trend: trendRows.map((row) => ({ date: row._id, revenue: round2(row.revenue), count: row.count })),
    hourly: hourRows.map((row) => ({ hour: row._id, revenue: round2(row.revenue), count: row.count })),
    types: typeRows.map((row) => ({ type: row._id, revenue: round2(row.revenue), count: row.count })),
  });
});

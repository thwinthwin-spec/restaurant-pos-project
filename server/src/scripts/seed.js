import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';
import { Setting, DEFAULT_SETTINGS } from '../models/Setting.js';
import { AuditLog } from '../models/AuditLog.js';
import { Counter } from '../models/Counter.js';

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=80`;

const MENU = [
  { name: 'Mohinga', category: 'Noodles', description: 'Burmese fish and rice noodle soup with banana stem', price: 4500, image: IMG('photo-1569718212165-3a8278d5f624'), emoji: '🍜', featured: true, sortOrder: 1 },
  { name: 'Shan Noodle Soup', category: 'Noodles', description: 'Handmade Shan noodles in a rich tomato broth', price: 5500, image: IMG('photo-1555126634-323283e090fa'), emoji: '🍲', sortOrder: 2 },
  { name: 'Lan Tha Oh', category: 'Noodles', description: 'Burmese curried noodles with chicken and egg', price: 5000, image: IMG('photo-1569718212165-3a8278d5f624'), emoji: '🍝', sortOrder: 3 },
  { name: 'Chicken Curry & Rice', category: 'Rice & Curry', description: 'Slow-cooked curry with fragrant jasmine rice', price: 6500, image: IMG('photo-1603894584373-5ac82b2ae398'), emoji: '🍛', featured: true, sortOrder: 4 },
  { name: 'Pork Belly Curry', category: 'Rice & Curry', description: 'Caramelised pork belly in dark soy gravy', price: 7500, image: IMG('photo-1546833999-b9f581a1996d'), emoji: '🥘', sortOrder: 5 },
  { name: 'Tom Yum Goong', category: 'Rice & Curry', description: 'Hot and sour prawn soup with lemongrass', price: 7800, image: IMG('photo-1547592180-85f173990554'), emoji: '🦐', sortOrder: 6 },
  { name: 'Laphet Thoke', category: 'Salads', description: 'Traditional fermented tea leaf salad', price: 4000, image: IMG('photo-1512621776951-a57141f2eefd'), emoji: '🥗', featured: true, sortOrder: 7 },
  { name: 'Green Mango Salad', category: 'Salads', description: 'Crunchy mango, herbs and roasted peanuts', price: 3800, image: IMG('photo-1540189549336-e6e99c3679fe'), emoji: '🥭', sortOrder: 8 },
  { name: 'Grilled Chicken Skewers', category: 'From the Grill', description: 'Charcoal grilled skewers with spicy dip', price: 7000, image: IMG('photo-1529193591184-b1d58069ecdd'), emoji: '🍢', sortOrder: 9 },
  { name: 'Salt Grilled Fish', category: 'From the Grill', description: 'Whole fish grilled in a salt crust', price: 12000, image: IMG('photo-1519708227418-c8fd9a32b7a2'), emoji: '🐟', sortOrder: 10 },
  { name: 'Spring Rolls', category: 'Starters', description: 'Crispy rolls with sweet chilli sauce', price: 4000, image: IMG('photo-1541592106381-b31e9677c0e5'), emoji: '🥟', sortOrder: 11 },
  { name: 'Mango Sticky Rice', category: 'Desserts', description: 'Coconut sticky rice with ripe mango', price: 3500, image: IMG('photo-1563805042-7684c019e1cb'), emoji: '🥭', featured: true, sortOrder: 12 },
  { name: 'Coconut Ice Cream', category: 'Desserts', description: 'Creamy coconut ice cream with peanuts', price: 3000, image: IMG('photo-1563805042-7684c019e1cb'), emoji: '🍨', sortOrder: 13 },
  { name: 'Shwe Yin Aye', category: 'Desserts', description: 'Burmese coconut milk dessert with bread', price: 3000, image: IMG('photo-1488477181946-6428a0291777'), emoji: '🍮', sortOrder: 14 },
  { name: 'Burmese Milk Tea', category: 'Drinks', description: 'Strong brewed tea with condensed milk', price: 2500, image: IMG('photo-1495474472287-4d71bcdd2085'), emoji: '🧋', sortOrder: 15 },
  { name: 'Fresh Lime Soda', category: 'Drinks', description: 'Sparkling lime, salt and soda', price: 2200, image: IMG('photo-1513558161293-cdaf765ed2fd'), emoji: '🥤', sortOrder: 16 },
];

function random(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function seed() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const clear = process.argv.includes('--clear');

  if (clear) {
    const result = await Promise.all([
      Order.deleteMany({ isDemo: true }),
      MenuItem.deleteMany({}),
      Counter.deleteMany({}),
      AuditLog.deleteMany({ action: 'demo_seed' }),
    ]);
    console.log('[seed] demo data removed:', result.map((r) => r.deletedCount).join(', '));
    await mongoose.disconnect();
    return;
  }

  await MenuItem.bulkWrite(
    MENU.map((item) => ({
      updateOne: { filter: { name: item.name }, update: { $set: { ...item, active: true } }, upsert: true },
    })),
  );

  await Setting.bulkWrite(
    Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
      updateOne: { filter: { key }, update: { $setOnInsert: { value } }, upsert: true },
    })),
  );

  const existingDemo = await Order.countDocuments({ isDemo: true });
  if (existingDemo === 0) {
    const menu = await MenuItem.find().lean();
    const rand = random(20261121);
    const orders = [];
    let sequence = 0;

    for (let day = 13; day >= 0; day -= 1) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - day);
      const count = 2 + Math.floor(rand() * 5);
      for (let n = 0; n < count; n += 1) {
        sequence += 1;
        const chosen = [];
        const lines = 1 + Math.floor(rand() * 4);
        for (let i = 0; i < lines; i += 1) {
          const item = menu[Math.floor(rand() * menu.length)];
          const existing = chosen.find((line) => line.name === item.name);
          if (existing) existing.quantity += 1;
          else chosen.push({ menuItem: item._id, name: item.name, price: item.price, quantity: 1, note: '' });
        }
        const subtotal = chosen.reduce((sum, line) => sum + line.price * line.quantity, 0);
        const discount = rand() > 0.85 ? Math.round(subtotal * 0.1) : 0;
        const taxable = subtotal - discount;
        const taxRate = 5;
        const tax = Math.round((taxable * taxRate) / 100);
        const createdAt = new Date(date);
        const latestHour = day === 0 ? new Date().getUTCHours() : 20;
        createdAt.setUTCHours(9 + Math.floor(rand() * Math.max(1, latestHour - 8)), Math.floor(rand() * 60), 0, 0);
        if (createdAt > new Date()) createdAt.setTime(Date.now() - Math.floor(rand() * 45 * 60 * 1000));
        const type = ['dine-in', 'dine-in', 'takeaway', 'delivery'][Math.floor(rand() * 4)];
        const awaitingConfirmation = day === 0 && n < 2;
        orders.push({
          _id: new mongoose.Types.ObjectId(),
          number: `DEMO-${String(sequence).padStart(4, '0')}`,
          type,
          table: type === 'dine-in' ? String(1 + Math.floor(rand() * 20)) : '',
          customerName: '',
          notes: '',
          items: chosen,
          subtotal,
          discount,
          taxRate,
          tax,
          total: taxable + tax,
          paymentMethod: ['cash', 'cash', 'kpay', 'kpay'][Math.floor(rand() * 4)],
          amountTendered: 0,
          change: 0,
          status: awaitingConfirmation ? 'pending' : 'paid',
          confirmedAt: awaitingConfirmation ? null : createdAt,
          confirmedBy: null,
          confirmedByName: awaitingConfirmation ? '' : 'Demo data',
          fulfillmentStatus: awaitingConfirmation ? (n === 0 ? 'open' : 'preparing') : 'completed',
          cashier: null,
          cashierName: 'Demo data',
          isDemo: true,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
    await Order.collection.insertMany(orders);
    console.log(`[seed] inserted ${orders.length} demo orders`);
  }

  console.log(`[seed] ready: ${await MenuItem.countDocuments()} menu items, ${await Order.countDocuments()} orders`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('[seed] failed:', error.message);
  process.exit(1);
});

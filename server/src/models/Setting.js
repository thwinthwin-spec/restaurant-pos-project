import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  { key: { type: String, required: true, unique: true }, value: { type: mongoose.Schema.Types.Mixed } },
  { versionKey: false },
);

export const Setting = mongoose.model('Setting', settingSchema);

export const DEFAULT_SETTINGS = Object.freeze({
  taxRate: 5,
  restaurantName: 'Table & Thyme',
  currency: 'MMK',
  currencySymbol: 'Ks',
  address: 'Yangon, Myanmar',
  phone: '+95 1 234 567 890',
  receiptFooter: 'Thank you for dining with us.',
});

export async function getSettings() {
  const docs = await Setting.find({ key: { $in: Object.keys(DEFAULT_SETTINGS) } }).lean();
  return Object.fromEntries(docs.map((doc) => [doc.key, doc.value]));
}

export async function getSetting(key) {
  const doc = await Setting.findOne({ key }).lean();
  return doc?.value ?? DEFAULT_SETTINGS[key] ?? null;
}

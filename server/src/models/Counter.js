import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, seq: { type: Number, default: 0 } }, { versionKey: false });

export const Counter = mongoose.model('Counter', counterSchema);

/** Atomic, collision-free sequential order number, e.g. TTH-20261121-0007. */
export async function nextOrderNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const key = `order:${day}`;
  const counter = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `TTH-${day}-${String(counter.seq).padStart(4, '0')}`;
}

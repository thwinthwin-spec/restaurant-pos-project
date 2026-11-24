import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 50, index: true },
    description: { type: String, trim: true, maxlength: 240, default: '' },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true, default: '' },
    emoji: { type: String, trim: true, default: '✳' },
    active: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

menuItemSchema.index({ name: 1, category: 1 }, { unique: true });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);

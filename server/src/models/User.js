import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: ['admin', 'cashier'], default: 'cashier', index: true },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.toJSON = function toJSON() {
  const { password, ...rest } = this.toObject();
  return rest;
};

export const User = mongoose.model('User', userSchema);

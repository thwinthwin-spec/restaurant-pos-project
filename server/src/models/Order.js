import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    note: { type: String, default: '', maxlength: 200 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], required: true, index: true },
    table: { type: String, trim: true, maxlength: 30, default: '' },
    customerName: { type: String, trim: true, maxlength: 80, default: '' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'kpay'], required: true, index: true },
    amountTendered: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'paid', 'cancelled', 'refunded'], default: 'pending', index: true },
    confirmedAt: { type: Date, default: null, index: true },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    confirmedByName: { type: String, default: '' },
    fulfillmentStatus: {
      type: String,
      enum: ['open', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    cashierName: { type: String, default: '' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, confirmedAt: -1 });

export const Order = mongoose.model('Order', orderSchema);

import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const setupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(10).max(128),
  taxRate: z.coerce.number().min(0).max(100),
  restaurantName: z.string().trim().min(2).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const settingsSchema = z.object({
  taxRate: z.coerce.number().min(0).max(100).optional(),
  restaurantName: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  receiptFooter: z.string().trim().max(200).optional(),
});

export const menuCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  description: z.string().trim().max(240).optional().default(''),
  price: z.coerce.number().min(0).max(100_000_000),
  image: z.string().trim().max(500).optional().default(''),
  emoji: z.string().trim().max(8).optional().default('✳'),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).optional().default(0),
});

export const menuUpdateSchema = menuCreateSchema.partial();

export const orderCreateSchema = z.object({
  type: z.enum(['dine-in', 'takeaway', 'delivery']),
  table: z.string().trim().max(30).optional().default(''),
  customerName: z.string().trim().max(80).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  paymentMethod: z.enum(['cash', 'kpay']),
  amountTendered: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0).optional().default(0),
  items: z
    .array(
      z.object({
        menuItem: objectId,
        quantity: z.coerce.number().int().min(1).max(99),
        note: z.string().trim().max(200).optional().default(''),
      }),
    )
    .min(1)
    .max(100),
});

export const fulfillmentSchema = z.object({
  status: z.enum(['open', 'preparing', 'ready', 'completed']),
});

export const orderQuerySchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  type: z.enum(['dine-in', 'takeaway', 'delivery']).optional(),
  status: z.enum(['pending', 'paid', 'cancelled', 'refunded']).optional(),
  paymentMethod: z.enum(['cash', 'kpay']).optional(),
  fulfillmentStatus: z.enum(['open', 'preparing', 'ready', 'completed', 'cancelled']).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const reportQuerySchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(10).max(128),
  role: z.enum(['admin', 'cashier']).optional().default('cashier'),
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(['admin', 'cashier']).optional(),
  active: z.boolean().optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export { objectId };

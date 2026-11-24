import { Router } from 'express';
import { authenticate, requireAdmin, validate } from './middleware.js';
import {
  setupSchema,
  loginSchema,
  settingsSchema,
  menuCreateSchema,
  menuUpdateSchema,
  orderCreateSchema,
  fulfillmentSchema,
  orderQuerySchema,
  reportQuerySchema,
  staffCreateSchema,
  staffUpdateSchema,
  auditQuerySchema,
} from './validators.js';

import * as auth from './controllers/auth.controller.js';
import * as menu from './controllers/menu.controller.js';
import * as orders from './controllers/order.controller.js';
import * as reports from './controllers/report.controller.js';
import * as admin from './controllers/admin.controller.js';

const router = Router();

// Public
router.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime(), time: new Date().toISOString() }));
router.get('/setup/status', auth.setupStatus);
router.post('/setup/admin', validate(setupSchema), auth.setupAdmin);
router.post('/auth/login', validate(loginSchema), auth.login);

// Authenticated
router.use(authenticate);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);

router.get('/settings', admin.getSettingsController);
router.put('/settings', requireAdmin, validate(settingsSchema), admin.updateSettings);

router.get('/menu', validate(orderQuerySchema.pick({ q: true }), 'query'), menu.listMenu);
router.post('/menu', requireAdmin, validate(menuCreateSchema), menu.createMenuItem);
router.patch('/menu/:id', requireAdmin, validate(menuUpdateSchema), menu.updateMenuItem);
router.delete('/menu/:id', requireAdmin, menu.deleteMenuItem);

router.get('/orders', validate(orderQuerySchema, 'query'), orders.listOrders);
router.get('/orders/:id', orders.getOrder);
router.post('/orders', validate(orderCreateSchema), orders.createOrder);
router.patch('/orders/:id/confirm', requireAdmin, orders.confirmOrder);
router.patch('/orders/:id/fulfillment', validate(fulfillmentSchema), orders.updateFulfillment);
router.patch('/orders/:id/cancel', requireAdmin, orders.cancelOrder);

router.get('/reports', validate(reportQuerySchema, 'query'), reports.getReport);

router.get('/staff', requireAdmin, admin.listStaff);
router.post('/staff', requireAdmin, validate(staffCreateSchema), admin.createStaff);
router.patch('/staff/:id', requireAdmin, validate(staffUpdateSchema), admin.updateStaff);

router.get('/audit', requireAdmin, validate(auditQuerySchema, 'query'), admin.listAudit);

export default router;

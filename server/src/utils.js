import crypto from 'node:crypto';

export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const pick = (object, keys) =>
  Object.fromEntries(keys.filter((key) => object?.[key] !== undefined).map((key) => [key, object[key]]));

export const toId = (value) => String(value ?? '');

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function pagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function dayBounds(from, to) {
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date();
  if (!from) start.setUTCHours(0, 0, 0, 0);
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  return { start, end };
}

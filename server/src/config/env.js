import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '../..');
export const CLIENT_DIST = path.resolve(SERVER_ROOT, '../client/dist');

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// A missing secret should never silently ship in production. In development we
// generate an ephemeral one so the project runs immediately after install.
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (isProduction) throw new Error('JWT_SECRET must be a random value of at least 32 characters');
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[config] JWT_SECRET is missing or short - using an ephemeral development secret.');
}

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant_pos',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  clientOrigins: origins,
  cookieName: 'pos_token',
  csrfCookieName: 'pos_csrf',
  csrfHeaderName: 'x-csrf-token',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || isProduction,
  cookieSameSite: process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'lax'),
  cookieMaxAge: int(process.env.COOKIE_MAX_AGE_SECONDS, 12 * 60 * 60) * 1000,
  loginLimit: int(process.env.LOGIN_RATE_LIMIT, 10),
  apiLimit: int(process.env.API_RATE_LIMIT, 600),
  trustProxy: process.env.TRUST_PROXY === 'true' || isProduction,
});

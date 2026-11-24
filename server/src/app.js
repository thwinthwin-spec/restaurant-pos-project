import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env, CLIENT_DIST } from './config/env.js';
import { csrfGuard, errorHandler, notFound } from './middleware.js';
import routes from './routes.js';

const app = express();

if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: env.isProduction
      ? {
          useDefaults: true,
          directives: {
            'img-src': ["'self'", 'data:', 'https:'],
            'connect-src': ["'self'", ...env.clientOrigins.map((o) => new URL(o).origin)],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const loopback = !env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      if (loopback || env.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', env.csrfHeaderName],
  }),
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(csrfGuard);

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.loginLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Please try again in a few minutes.' },
  }),
);

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: env.apiLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' },
  }),
);

app.use('/api', routes);

if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1y', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;

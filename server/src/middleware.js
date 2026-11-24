import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { AppError, asyncHandler, randomToken } from './utils.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
  maxAge: env.cookieMaxAge,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
});

export const sessionCookieOptions = cookieOptions;

export function issueSession(req, res, user) {
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, jwtid: randomToken(8) },
  );
  res.cookie(env.cookieName, token, cookieOptions());
  if (!req.cookies?.[env.csrfCookieName]) {
    res.cookie(env.csrfCookieName, randomToken(24), {
      httpOnly: false,
      secure: env.cookieSecure,
      sameSite: env.cookieSameSite,
      path: '/',
      maxAge: env.cookieMaxAge,
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });
  }
  return token;
}

export function clearSession(res) {
  const opts = { ...cookieOptions(), maxAge: undefined };
  res.clearCookie(env.cookieName, opts);
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const token = req.cookies?.[env.cookieName] || bearer;
  if (!token) throw new AppError(401, 'Please sign in to continue');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Your session has expired. Please sign in again');
  }

  const user = await User.findById(payload.id).select('name email role active');
  if (!user || !user.active) throw new AppError(401, 'This account is no longer active');
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError(403, 'Administrator access is required'));
  next();
};

/** Double-submit CSRF cookie pattern for cookie-authenticated state changes. */
export function csrfGuard(req, res, next) {
  const hadCookie = Boolean(req.cookies?.[env.csrfCookieName]);
  if (!hadCookie) {
    res.cookie(env.csrfCookieName, randomToken(24), {
      httpOnly: false,
      secure: env.cookieSecure,
      sameSite: env.cookieSameSite,
      path: '/',
      maxAge: env.cookieMaxAge,
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });
    // First visit bootstraps the token; every later state change must echo it.
    return next();
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies[env.csrfCookieName];
  const headerToken = req.headers[env.csrfHeaderName.toLowerCase()];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError(403, 'Request verification failed. Please refresh and try again'));
  }
  next();
}

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    return next(new AppError(400, 'Please check the highlighted fields', issues));
  }
  req.validated = source === 'body' ? result.data : { ...(req.validated || {}), ...result.data };
  next();
};

export const notFound = (_req, _res, next) => next(new AppError(404, 'The requested resource was not found'));

export function errorHandler(error, _req, res, _next) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field} is already in use` });
  }
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier' });
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Please check the provided values',
      issues: Object.entries(error.errors).map(([field, value]) => ({ field, message: value.message })),
    });
  }

  const status = error.status || 500;
  if (status >= 500) console.error('[error]', error);
  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on our side. Please try again.' : error.message,
    ...(error.details ? { issues: error.details } : {}),
  });
}

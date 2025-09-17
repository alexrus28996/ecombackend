import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import { createLogger } from './logger.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { router as apiRouter } from './interfaces/http/routes/index.js';
import { buildOpenApiSpec } from './docs/spec.js';
import { auditAdminWrites } from './middleware/audit.js';

/**
 * Build and configure an Express application instance.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  const logger = createLogger({ level: config.LOG_LEVEL, name: config.APP_NAME });

  if (config.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(pinoHttp({
    logger,
    genReqId: (req, res) => req.headers['x-request-id'] || crypto.randomUUID(),
    customProps: (req) => ({ requestId: req.id })
  }));
  // Basic request timing metrics
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      try {
        const durMs = Number(process.hrtime.bigint() - start) / 1e6;
        req.log.info({ responseTimeMs: Math.round(durMs) }, 'request_timing');
      } catch {}
    });
    next();
  });
  app.use((req, res, next) => {
    if (req.id) res.setHeader('X-Request-Id', req.id);
    next();
  });
  // Helmet with safe defaults; configurable CSP via env
  const helmetOpts = {};
  if (config.CSP_ENABLED) {
    const addList = (base, extra) => {
      const list = [...base];
      if (extra) extra.split(',').map(s => s.trim()).filter(Boolean).forEach(v => list.push(v));
      return Array.from(new Set(list));
    };
    const imgBase = ["'self'", 'data:', 'https:'];
    // If Cloudinary configured, allow its host
    if (config.CLOUDINARY_CLOUD_NAME) imgBase.push('https://res.cloudinary.com');
    const directives = {
      "default-src": ["'self'"],
      "img-src": addList(imgBase, config.CSP_IMG_SRC),
      "connect-src": addList(["'self'"], config.CSP_CONNECT_SRC),
      "style-src": addList(["'self'", "'unsafe-inline'", 'https:'], config.CSP_STYLE_SRC),
      "script-src": addList(["'self'", "'unsafe-inline'"], config.CSP_SCRIPT_SRC),
      "object-src": ["'none'"],
    };
    helmetOpts.contentSecurityPolicy = { useDefaults: true, directives };
    helmetOpts.crossOriginEmbedderPolicy = false;
    helmetOpts.crossOriginResourcePolicy = { policy: 'cross-origin' };
  }
  app.use(helmet(helmetOpts));
  app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map(s => s.trim()), credentials: true }));
  // Stripe webhook requires raw body; set raw for its path before JSON parser
  app.use(`${config.API_PREFIX}/payments/stripe/webhook`, express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: config.JSON_BODY_LIMIT }));

  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(config.API_PREFIX, limiter);

  // Stricter rate limit for auth endpoints
  const authLimiter = rateLimit({
    windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
    max: config.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(`${config.API_PREFIX}/auth`, authLimiter);

  // Stricter limiter for uploads
  const uploadsLimiter = rateLimit({
    windowMs: config.UPLOADS_RATE_LIMIT_WINDOW_MS,
    max: config.UPLOADS_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(`${config.API_PREFIX}/uploads`, uploadsLimiter);

  // Stricter limiter for payments endpoints
  const paymentsLimiter = rateLimit({
    windowMs: config.PAYMENTS_RATE_LIMIT_WINDOW_MS,
    max: config.PAYMENTS_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(`${config.API_PREFIX}/payments`, paymentsLimiter);

  // Health
  app.get(config.HEALTH_PATH, (req, res) => res.json({ status: 'ok', name: config.APP_NAME }));

  // Static uploads (local dev)
  app.use('/uploads', express.static(config.UPLOADS_DIR));

  // Audit admin write operations
  app.use(auditAdminWrites);

  // API Docs (Swagger UI)
  const openapi = buildOpenApiSpec();
  app.get(`${config.DOCS_PATH}/openapi.json`, (req, res) => res.json(openapi));
  app.use(config.DOCS_PATH, swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));

  // API
  app.use(config.API_PREFIX, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

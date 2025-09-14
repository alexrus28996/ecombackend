import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import { createLogger } from './logger.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { router as apiRouter } from './interfaces/http/routes/index.js';
import { buildOpenApiSpec } from './docs/spec.js';

/**
 * Build and configure an Express application instance.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  const logger = createLogger({ level: config.LOG_LEVEL, name: config.APP_NAME });

  if (config.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));
  app.use(morgan('tiny'));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map(s => s.trim()), credentials: true }));
  app.use(express.json({ limit: config.JSON_BODY_LIMIT }));

  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(config.API_PREFIX, limiter);

  // Health
  app.get(config.HEALTH_PATH, (req, res) => res.json({ status: 'ok', name: config.APP_NAME }));

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

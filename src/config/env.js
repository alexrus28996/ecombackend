import { cleanEnv, str, num, bool } from 'envalid';

/**
 * Validate and normalize environment variables for the app.
 */
export function loadEnv(raw = process.env) {
  return cleanEnv(raw, {
    NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
    PORT: num({ default: 4000 }),
    APP_NAME: str({ default: 'ecombackend' }),
     MONGO_URI: str(),
     DB_NAME: str({ default: '' }),
    JWT_SECRET: str(),
    JWT_EXPIRES_IN: str({ default: '7d' }),
    CORS_ORIGIN: str({ default: '*' }),
    LOG_LEVEL: str({ default: 'info' }),
    RATE_LIMIT_WINDOW_MS: num({ default: 15 * 60 * 1000 }),
    RATE_LIMIT_MAX: num({ default: 200 }),
    TRUST_PROXY: bool({ default: true }),
    API_PREFIX: str({ default: '/api' }),
    JSON_BODY_LIMIT: str({ default: '1mb' }),
    DEFAULT_CURRENCY: str({ default: 'USD' }),
    API_DEFAULT_PAGE_SIZE: num({ default: 20 }),
    API_MAX_PAGE_SIZE: num({ default: 100 }),
    HEALTH_PATH: str({ default: '/health' }),
    DOCS_PATH: str({ default: '/docs' })
  });
}

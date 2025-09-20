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
    JWT_EXPIRES_IN: str({ default: '15m' }),
    REFRESH_TOKEN_SECRET: str({ default: '' }),
    REFRESH_TOKEN_EXPIRES_IN: str({ default: '7d' }),
    PASSWORD_RESET_EXPIRES_IN: str({ default: '1h' }),
    CORS_ORIGIN: str({ default: '*' }),
    LOG_LEVEL: str({ default: 'info' }),
    LOG_FILE: str({ default: '' }),
    LOG_ROTATE_ENABLED: bool({ default: false }),
    LOG_ROTATE_INTERVAL: str({ default: '1d' }),
    LOG_ROTATE_SIZE: str({ default: '' }),
    LOG_ROTATE_MAX_FILES: num({ default: 7 }),
    DB_LOG_COMMANDS: bool({ default: false }),
    DB_SLOW_MS: num({ default: 50 }),
    RATE_LIMIT_WINDOW_MS: num({ default: 15 * 60 * 1000 }),
    RATE_LIMIT_MAX: num({ default: 200 }),
    AUTH_RATE_LIMIT_WINDOW_MS: num({ default: 60 * 1000 }),
    AUTH_RATE_LIMIT_MAX: num({ default: 20 }),
    MAX_LOGIN_ATTEMPTS: num({ default: 5 }),
    LOCK_TIME_MS: num({ default: 15 * 60 * 1000 }),
    UPLOADS_RATE_LIMIT_WINDOW_MS: num({ default: 5 * 60 * 1000 }),
    UPLOADS_RATE_LIMIT_MAX: num({ default: 50 }),
    PAYMENTS_RATE_LIMIT_WINDOW_MS: num({ default: 5 * 60 * 1000 }),
    PAYMENTS_RATE_LIMIT_MAX: num({ default: 50 }),
    TRUST_PROXY: bool({ default: true }),
    API_PREFIX: str({ default: '/api' }),
    JSON_BODY_LIMIT: str({ default: '1mb' }),
    DEFAULT_CURRENCY: str({ default: 'USD' }),
    API_DEFAULT_PAGE_SIZE: num({ default: 20 }),
    API_MAX_PAGE_SIZE: num({ default: 100 }),
    HEALTH_PATH: str({ default: '/health' }),
    DOCS_PATH: str({ default: '/docs' })
    ,
    LOCALE: str({ default: 'en-US' })
    ,
    // Payments (Stripe)
    STRIPE_SECRET_KEY: str({ default: '' }),
    STRIPE_WEBHOOK_SECRET: str({ default: '' }),
    // Uploads
    UPLOADS_DIR: str({ default: 'uploads' }),
    MAX_UPLOAD_SIZE: str({ default: '5mb' }),
    // Inventory/alerts
    LOW_STOCK_THRESHOLD: num({ default: 5 }),
    ALERT_EMAIL: str({ default: '' }),
    // Pricing defaults
    TAX_DEFAULT_RATE: num({ default: 0 }),
    SHIPPING_FLAT_RATE: num({ default: 0 }),
    SHIPPING_FREE_LIMIT: num({ default: 0 }),
    // Cloudinary (optional)
    CLOUDINARY_CLOUD_NAME: str({ default: '' }),
    CLOUDINARY_API_KEY: str({ default: '' }),
    CLOUDINARY_API_SECRET: str({ default: '' }),
    CLOUDINARY_FOLDER: str({ default: 'ecombackend' }),
    // CSP controls
    CSP_ENABLED: bool({ default: false }),
    CSP_IMG_SRC: str({ default: '' }),
    CSP_SCRIPT_SRC: str({ default: '' }),
    CSP_STYLE_SRC: str({ default: '' }),
    CSP_CONNECT_SRC: str({ default: '' })
    ,
    // Jobs
    ORDER_AUTO_CANCEL_MINUTES: num({ default: 120 }),
    // Queue / Redis
    QUEUE_ENABLED: bool({ default: false }),
    REDIS_URL: str({ default: '' })
  });
}

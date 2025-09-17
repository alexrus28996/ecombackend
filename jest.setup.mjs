// Ensure required env vars exist before modules import config
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecom_test';
process.env.DB_NAME = process.env.DB_NAME || 'ecom_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

// Pricing defaults used by calcShipping/calcTax
process.env.SHIPPING_FREE_LIMIT = process.env.SHIPPING_FREE_LIMIT || '50';
process.env.SHIPPING_FLAT_RATE = process.env.SHIPPING_FLAT_RATE || '5';
process.env.TAX_DEFAULT_RATE = process.env.TAX_DEFAULT_RATE || '0.15';


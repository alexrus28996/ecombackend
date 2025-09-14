import pino from 'pino';

let logger;

/**
 * Create a singleton pino logger instance.
 * @param {{ level?: string, name?: string }} options
 * @returns {import('pino').Logger}
 */
export function createLogger({ level = 'info', name = 'app' } = {}) {
  if (!logger) {
    logger = pino({ level, name });
  }
  return logger;
}

/**
 * Get the existing logger or create a default one.
 * @returns {import('pino').Logger}
 */
export function getLogger() {
  if (!logger) logger = pino({ level: 'info', name: 'app' });
  return logger;
}

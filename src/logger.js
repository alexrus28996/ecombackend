import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { config } from './config/index.js';
import { createStream as createRotatingStream } from 'rotating-file-stream';

let logger;

/**
 * Create a singleton pino logger instance.
 * @param {{ level?: string, name?: string }} options
 * @returns {import('pino').Logger}
 */
export function createLogger({ level = 'info', name = 'app' } = {}) {
  if (!logger) {
    if (config.LOG_FILE) {
      // File logging
      const filePath = path.resolve(String(config.LOG_FILE));
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      if (config.LOG_ROTATE_ENABLED) {
        // Rotate by interval/size using rotating-file-stream
        const stream = createRotatingStream(path.basename(filePath), {
          path: dir,
          interval: config.LOG_ROTATE_INTERVAL || '1d',
          size: config.LOG_ROTATE_SIZE || undefined,
          maxFiles: Number(config.LOG_ROTATE_MAX_FILES) || undefined,
          teeToStdout: false
        });
        logger = pino({ level, name }, stream);
      } else {
        const destination = pino.destination({ dest: filePath, mkdir: true, sync: false });
        logger = pino({ level, name }, destination);
      }
    } else {
      logger = pino({ level, name });
    }
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

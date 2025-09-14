import { config } from '../../config/index.js';

export function getRedisConnection() {
  if (!config.REDIS_URL) return null;
  return { url: config.REDIS_URL };
}


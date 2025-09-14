import { Queue } from 'bullmq';
import { config } from '../../config/index.js';
import { getRedisConnection } from './connection.js';

let queue = null;
if (config.QUEUE_ENABLED && config.REDIS_URL) {
  queue = new Queue('mail', { connection: getRedisConnection() });
}

export async function enqueueMail({ to, subject, text, html }) {
  if (!queue) throw new Error('Queue not enabled');
  await queue.add('mail', { to, subject, text, html }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}


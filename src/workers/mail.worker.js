import 'dotenv/config';
import { Worker, QueueScheduler } from 'bullmq';
import { config } from '../config/index.js';
import { getRedisConnection } from './queues/connection.js';
import { sendEmail } from '../utils/email.js';

if (!config.QUEUE_ENABLED || !config.REDIS_URL) {
  // eslint-disable-next-line no-console
  console.error('Queue not enabled or REDIS_URL missing');
  process.exit(1);
}

const connection = getRedisConnection();
// optional scheduler for delayed/retries
new QueueScheduler('mail', { connection });

// eslint-disable-next-line no-new
new Worker('mail', async (job) => {
  const { to, subject, text, html } = job.data || {};
  if (!to || !subject) return;
  await sendEmail({ to, subject, text, html });
}, { connection });

// eslint-disable-next-line no-console
console.log('Mail worker started');


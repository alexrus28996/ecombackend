import { config } from '../config/index.js';
import { sendEmail } from './email.js';
import { getLogger } from '../logger.js';

const logger = getLogger().child({ module: 'mailer' });

let enqueueMailFn = null;
async function ensureQueue() {
  if (!config.QUEUE_ENABLED || !config.REDIS_URL) return null;
  if (enqueueMailFn) return enqueueMailFn;
  const mod = await import('../workers/queues/mail.queue.js');
  enqueueMailFn = mod.enqueueMail;
  return enqueueMailFn;
}

export async function deliverEmail(payload) {
  try {
    const enq = await ensureQueue();
    if (enq) {
      await enq(payload);
      return { queued: true };
    }
  } catch (err) {
    logger.warn({ err }, 'failed to enqueue email, falling back to direct send');
  }
  await sendEmail(payload);
  return { queued: false };
}


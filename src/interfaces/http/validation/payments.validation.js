import { z } from 'zod';

export const createIntentSchema = { body: z.object({ orderId: z.string() }) };


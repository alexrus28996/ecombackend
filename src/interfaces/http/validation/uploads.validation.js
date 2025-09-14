import { z } from 'zod';

export const cloudinaryDeleteSchema = { body: z.object({ publicId: z.string() }) };


import 'dotenv/config';
import { loadEnv } from './env.js';

/**
 * App-wide configuration (validated env values).
 */
export const config = loadEnv();

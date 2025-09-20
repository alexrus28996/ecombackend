import { enUS } from './en-US.js';
import { config } from '../config/index.js';

const bundles = { 'en-US': enUS };

export function t(key, params = {}, locale = config.LOCALE || 'en-US') {
  const dict = bundles[locale] || enUS;
  const val = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
  if (!val || typeof val !== 'string') return key;
  return val.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}


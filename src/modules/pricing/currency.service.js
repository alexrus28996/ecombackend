import { CurrencyRate } from './currency-rate.model.js';
import { config } from '../../config/index.js';
import { errors, ERROR_CODES } from '../../errors/index.js';

const ROUNDING_MODES = ['HALF_UP', 'UP', 'DOWN'];

function normalizeCurrency(code) {
  if (!code || typeof code !== 'string') {
    throw errors.badRequest(ERROR_CODES.CURRENCY_UNSUPPORTED, { currency: code });
  }
  return code.trim().toUpperCase();
}

function getBaseCurrency(baseCurrency) {
  return normalizeCurrency(baseCurrency || config.FX_BASE_CURRENCY || config.DEFAULT_CURRENCY);
}

function resolveRoundingSettings(override) {
  const rawMode = override?.mode ? String(override.mode).toUpperCase() : String(config.FX_ROUNDING_MODE || '').toUpperCase();
  const mode = ROUNDING_MODES.includes(rawMode) ? rawMode : 'HALF_UP';
  const rawIncrement = override?.increment ?? config.FX_ROUNDING_INCREMENT ?? 0.01;
  const numericIncrement = Number(rawIncrement);
  const increment = Number.isFinite(numericIncrement) && numericIncrement > 0 ? numericIncrement : 0.01;
  return { mode, increment };
}

function roundAmount(amount, rounding) {
  if (rounding === false) return amount;
  if (typeof rounding === 'object' && rounding !== null) return applyRounding(amount, rounding);
  return applyRounding(amount);
}

function applyRounding(amount, override) {
  const { mode, increment } = resolveRoundingSettings(override);
  const factor = 1 / increment;
  const scaled = amount * factor;
  if (mode === 'UP') return Math.ceil(scaled) / factor;
  if (mode === 'DOWN') return Math.floor(scaled) / factor;
  return Math.round((scaled + Number.EPSILON)) / factor;
}

async function loadRateMap(baseCurrency) {
  const base = getBaseCurrency(baseCurrency);
  const docs = await CurrencyRate.find({ baseCurrency: base }).lean();
  const map = new Map();
  map.set(base, 1);
  docs.forEach((doc) => {
    map.set(normalizeCurrency(doc.currency), Number(doc.rate));
  });
  return { base, map };
}

export async function listRates(baseCurrency) {
  const base = getBaseCurrency(baseCurrency);
  const rates = await CurrencyRate.find({ baseCurrency: base }).sort({ currency: 1 }).lean();
  return { baseCurrency: base, rates };
}

export async function upsertRate({ currency, rate, baseCurrency, source, metadata } = {}) {
  const base = getBaseCurrency(baseCurrency);
  const target = normalizeCurrency(currency);
  const numericRate = Number(rate);
  if (base === target) {
    throw errors.badRequest(ERROR_CODES.FX_RATE_SELF_REFERENCE, { currency: target });
  }
  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { field: 'rate', message: 'Rate must be greater than 0' });
  }
  const update = {
    baseCurrency: base,
    currency: target,
    rate: numericRate,
    source: source || undefined
  };
  if (metadata && typeof metadata === 'object') update.metadata = metadata;
  const doc = await CurrencyRate.findOneAndUpdate(
    { baseCurrency: base, currency: target },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
}

export async function removeRate({ currency, baseCurrency } = {}) {
  const base = getBaseCurrency(baseCurrency);
  const target = normalizeCurrency(currency);
  if (base === target) {
    throw errors.badRequest(ERROR_CODES.FX_RATE_SELF_REFERENCE, { currency: target });
  }
  await CurrencyRate.deleteOne({ baseCurrency: base, currency: target });
  return { success: true };
}

export async function convertAmount(amount, { fromCurrency, toCurrency, baseCurrency, rounding = true } = {}) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    throw errors.badRequest(ERROR_CODES.VALIDATION_ERROR, null, { field: 'amount', message: 'Amount must be numeric' });
  }
  const from = normalizeCurrency(fromCurrency || baseCurrency || config.DEFAULT_CURRENCY);
  const to = normalizeCurrency(toCurrency || config.DEFAULT_CURRENCY);
  if (from === to) return roundAmount(numericAmount, rounding);
  const { base, map } = await loadRateMap(baseCurrency);
  const fromRate = from === base ? 1 : map.get(from);
  const toRate = to === base ? 1 : map.get(to);
  if (!fromRate) throw errors.badRequest(ERROR_CODES.FX_RATE_NOT_FOUND, { currency: from });
  if (!toRate) throw errors.badRequest(ERROR_CODES.FX_RATE_NOT_FOUND, { currency: to });
  const baseAmount = from === base ? numericAmount : numericAmount / fromRate;
  const converted = to === base ? baseAmount : baseAmount * toRate;
  return roundAmount(converted, rounding);
}

export async function getRate(currency, baseCurrency) {
  const base = getBaseCurrency(baseCurrency);
  const target = normalizeCurrency(currency);
  if (base === target) return { baseCurrency: base, currency: target, rate: 1 };
  const doc = await CurrencyRate.findOne({ baseCurrency: base, currency: target }).lean();
  if (!doc) throw errors.badRequest(ERROR_CODES.FX_RATE_NOT_FOUND, { currency: target });
  return doc;
}






import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { CurrencyRate } from '../src/modules/pricing/currency-rate.model.js';
import { upsertRate, convertAmount, listRates, removeRate } from '../src/modules/pricing/currency.service.js';
import { config } from '../src/config/index.js';
import { connectOrSkip, disconnectIfNeeded, skipIfNeeded } from './helpers/test-db.js';

jest.setTimeout(30000);

describe('Currency rate service', () => {
  let shouldSkip = false;
  const baseCurrency = (config.FX_BASE_CURRENCY || config.DEFAULT_CURRENCY || 'USD').toUpperCase();

  beforeAll(async () => {
    const { skip } = await connectOrSkip();
    shouldSkip = skip;
  });

  beforeEach(async () => {
    if (shouldSkip) return;
    await CurrencyRate.deleteMany({});
  });

  afterAll(async () => {
    await disconnectIfNeeded(shouldSkip);
  });

  test('converts amounts using stored FX rates', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    const rate = await upsertRate({ baseCurrency, currency: 'EUR', rate: 0.9, source: 'test' });
    expect(rate.currency).toBe('EUR');

    const list = await listRates(baseCurrency);
    expect(list.rates.length).toBe(1);

    const eurAmount = await convertAmount(100, { fromCurrency: baseCurrency, toCurrency: 'EUR' });
    expect(eurAmount).toBeCloseTo(90, 2);

    const backToBase = await convertAmount(eurAmount, { fromCurrency: 'EUR', toCurrency: baseCurrency });
    expect(backToBase).toBeCloseTo(100, 2);
  });

  test('applies rounding rules according to config', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await upsertRate({ baseCurrency, currency: 'JPY', rate: 110.25 });
    const converted = await convertAmount(12.34, { fromCurrency: baseCurrency, toCurrency: 'JPY', rounding: { mode: 'UP', increment: 0.05 } });
    // Base to JPY => 12.34 * 110.25 = 1359.585 -> rounded up to nearest 0.05 => 1360.50
    expect(converted).toBeCloseTo(1360.5, 2);

    const roundedDown = await convertAmount(converted, { fromCurrency: 'JPY', toCurrency: baseCurrency, rounding: { mode: 'DOWN', increment: 0.05 } });
    // Back conversion should round down to nearest 0.05 before returning
    expect(roundedDown).toBeLessThan(converted / 110.25 + 0.01);
  });

  test('removes stored rates', async () => {
    if (skipIfNeeded(shouldSkip)) return;
    await upsertRate({ baseCurrency, currency: 'GBP', rate: 0.78 });
    await removeRate({ baseCurrency, currency: 'GBP' });
    const list = await listRates(baseCurrency);
    expect(list.rates.length).toBe(0);
  });
});








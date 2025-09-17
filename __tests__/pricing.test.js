import { calcShipping, calcTax } from '../src/modules/checkout/pricing.service.js';

describe('Pricing service', () => {
  test('calcShipping respects free limit and flat rate', () => {
    expect(calcShipping({ subtotal: 100 })).toBe(0); // >= free limit
    expect(calcShipping({ subtotal: 10 })).toBe(Number(process.env.SHIPPING_FLAT_RATE));
  });

  test('calcTax rounds to two decimals', () => {
    const amount = calcTax({ subtotal: 12.34 }); // uses default 0.15 from setup
    expect(amount).toBe(1.85);
  });
});


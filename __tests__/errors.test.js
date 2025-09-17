import { format } from '../src/errors/messages.js';

describe('Error messages format()', () => {
  test('replaces placeholders with params', () => {
    const out = format('Hello {name}, code {code}', { name: 'Alice', code: 42 });
    expect(out).toBe('Hello Alice, code 42');
  });

  test('returns empty string for falsy template', () => {
    expect(format('', { a: 1 })).toBe('');
    expect(format(null, { a: 1 })).toBe('');
  });
});


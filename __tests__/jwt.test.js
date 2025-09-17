import { signAccessToken, verifyAccessToken, decodeToken } from '../src/utils/jwt.js';

describe('JWT utils', () => {
  test('signs and verifies token', () => {
    const payload = { sub: 'u1', email: 'test@example.com', name: 'Tester', roles: ['customer'] };
    const token = signAccessToken(payload, '1h');
    expect(typeof token).toBe('string');

    const verified = verifyAccessToken(token);
    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(Array.isArray(verified.roles)).toBe(true);

    const decoded = decodeToken(token);
    expect(decoded.sub).toBe(payload.sub);
  });
});


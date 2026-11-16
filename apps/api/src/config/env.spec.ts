import { describe, expect, it } from 'vitest';

import { loadEnv } from './env.js';

const SHORT = 'curto-demais'; // scan-allow: fake
const base = { DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: 'a'.repeat(32) }; // scan-allow: fake

describe('loadEnv', () => {
  it('aplica os padrões', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3340);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.SHOP_TIMEZONE).toBe('America/Sao_Paulo');
  });
  it('recusa segredo curto sem vazar o valor', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: SHORT })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: SHORT })).not.toThrow(/curto-demais/);
  });
});

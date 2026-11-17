import { describe, expect, it } from 'vitest';

import { int, pickWeighted, seeded } from './rng.js';

describe('rng', () => {
  it('a mesma semente gera a mesma sequência', () => {
    const a = seeded(42);
    const b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('int respeita os limites e pickWeighted respeita os pesos', () => {
    const r = seeded(1);
    for (let i = 0; i < 200; i++) {
      const n = int(r, 3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++)
      counts[
        pickWeighted(r, [
          ['a', 9],
          ['b', 1],
        ] as ['a' | 'b', number][])
      ]++;
    expect(counts.a).toBeGreaterThan(counts.b * 5);
  });
});

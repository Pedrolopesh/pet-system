import { describe, expect, it } from 'vitest';

import { lastDays, localDay, startOfLocalDay, startOfLocalMonth } from './time.js';

const TZ = 'America/Sao_Paulo';

describe('time', () => {
  it('usa o dia local da loja, não o UTC', () => {
    // 01:30 UTC do dia 10 ainda é dia 9 em Brasília (UTC-3)
    expect(localDay(new Date('2026-11-10T01:30:00Z'), TZ)).toBe('2026-11-09');
  });
  it('início do dia e do mês no fuso da loja', () => {
    expect(startOfLocalDay(new Date('2026-11-10T15:00:00Z'), TZ).toISOString()).toBe(
      '2026-11-10T03:00:00.000Z',
    );
    expect(startOfLocalMonth(new Date('2026-11-10T15:00:00Z'), TZ).toISOString()).toBe(
      '2026-11-01T03:00:00.000Z',
    );
  });
  it('lista os últimos dias em ordem', () => {
    expect(lastDays(new Date('2026-11-10T15:00:00Z'), 3, TZ)).toEqual([
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ]);
  });
});

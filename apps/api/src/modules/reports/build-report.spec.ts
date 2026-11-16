import { describe, expect, it } from 'vitest';

import { buildReport, type ReportSale } from './build-report.js';

const emp = { id: 'e1', name: 'Ana' };
const sale = (
  at: string,
  items: ReportSale['items'],
  extra: Partial<ReportSale> = {},
): ReportSale => {
  const total = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return {
    at: new Date(at),
    total,
    discount: 0,
    cost: Math.round(total / 2),
    payment: 'pix',
    employee: emp,
    items,
    ...extra,
  };
};
const racao = { productId: 'p1', name: 'Ração', category: 'racao' as const, unitPrice: 10000 };
const banho = { productId: 'p2', name: 'Banho', category: 'servico' as const, unitPrice: 5000 };

describe('buildReport', () => {
  const end = new Date('2026-11-10T20:00:00Z');
  const sales = [
    sale('2026-11-10T14:00:00Z', [{ ...racao, qty: 2 }]),
    sale('2026-11-09T14:00:00Z', [{ ...banho, qty: 1 }], {
      payment: 'credito',
      employee: { id: 'e2', name: 'Bia' },
    }),
    // Venda com desconto: 15.000 − 3.000 = 12.000, rateado entre os itens
    sale(
      '2026-11-08T14:00:00Z',
      [
        { ...racao, qty: 1 },
        { ...banho, qty: 1 },
      ],
      { total: 12000, discount: 3000, cost: 6000 },
    ),
  ];

  it('soma receita, ticket médio e lucro bruto', () => {
    const r = buildReport({
      sales,
      previousRevenue: 20000,
      end,
      days: 7,
      timeZone: 'America/Sao_Paulo',
    });
    expect(r.revenue).toBe(37000);
    expect(r.sales).toBe(3);
    expect(r.averageTicket).toBe(12333);
    expect(r.grossProfit).toBe(37000 - 10000 - 2500 - 6000);
    expect(r.revenueChange).toBe(85);
  });

  it('rateia o desconto entre os itens e ordena os mais vendidos', () => {
    const r = buildReport({
      sales,
      previousRevenue: 0,
      end,
      days: 7,
      timeZone: 'America/Sao_Paulo',
    });
    expect(r.topProducts[0]).toEqual({
      productId: 'p1',
      name: 'Ração',
      qty: 3,
      revenue: 20000 + 8000,
    });
    expect(r.topProducts[1]?.revenue).toBe(5000 + 4000);
    expect(r.byCategory.map((c) => c.category)).toEqual(['racao', 'servico']);
    expect(r.revenueChange).toBeNull();
  });

  it('agrupa por pagamento, equipe e dia (com zeros nos dias sem venda)', () => {
    const r = buildReport({
      sales,
      previousRevenue: 0,
      end,
      days: 7,
      timeZone: 'America/Sao_Paulo',
    });
    expect(r.byPayment).toEqual([
      { payment: 'pix', revenue: 32000, sales: 2 },
      { payment: 'credito', revenue: 5000, sales: 1 },
    ]);
    expect(r.byEmployee.map((e) => e.name)).toEqual(['Ana', 'Bia']);
    expect(r.byDay).toHaveLength(7);
    expect(r.byDay.at(-1)).toEqual({ day: '2026-11-10', revenue: 20000, sales: 1 });
    expect(r.byDay[0]).toEqual({ day: '2026-11-04', revenue: 0, sales: 0 });
  });

  it('período vazio não divide por zero', () => {
    const r = buildReport({
      sales: [],
      previousRevenue: 0,
      end,
      days: 30,
      timeZone: 'America/Sao_Paulo',
    });
    expect(r.averageTicket).toBe(0);
    expect(r.topProducts).toEqual([]);
  });
});

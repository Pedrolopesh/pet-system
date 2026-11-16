import type { Category, DayPoint, Payment, Report } from '@petsystem/contracts';

import { lastDays, localDay } from '../../common/time.js';

export type ReportSale = {
  at: Date;
  total: number;
  discount: number;
  cost: number;
  payment: Payment;
  employee: { id: string; name: string };
  items: { productId: string; name: string; category: Category; qty: number; unitPrice: number }[];
};

/** Soma as vendas por dia local, com zero nos dias sem venda. */
export function revenueByDay(
  sales: ReportSale[],
  end: Date,
  days: number,
  timeZone: string,
): DayPoint[] {
  const points = new Map<string, DayPoint>(
    lastDays(end, days, timeZone).map((day) => [day, { day, revenue: 0, sales: 0 }]),
  );
  for (const s of sales) {
    const point = points.get(localDay(s.at, timeZone));
    if (!point) continue;
    point.revenue += s.total;
    point.sales += 1;
  }
  return [...points.values()];
}

/**
 * Relatório do período a partir das vendas (função pura). `previousRevenue` é a receita do período
 * anterior de mesmo tamanho, para a variação.
 */
export function buildReport(input: {
  sales: ReportSale[];
  previousRevenue: number;
  /** Início do período (padrão: `days` × 24 h antes de `end`). */
  from?: Date;
  end: Date;
  days: number;
  timeZone: string;
}): Report {
  const { sales, previousRevenue, end, days, timeZone } = input;
  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const grossProfit = sales.reduce((sum, s) => sum + s.total - s.cost, 0);

  const products = new Map<
    string,
    { productId: string; name: string; qty: number; revenue: number }
  >();
  const categories = new Map<Category, number>();
  const payments = new Map<Payment, { payment: Payment; revenue: number; sales: number }>();
  const employees = new Map<
    string,
    { employeeId: string; name: string; revenue: number; sales: number }
  >();

  for (const s of sales) {
    const pay = payments.get(s.payment) ?? { payment: s.payment, revenue: 0, sales: 0 };
    pay.revenue += s.total;
    pay.sales += 1;
    payments.set(s.payment, pay);

    const emp = employees.get(s.employee.id) ?? {
      employeeId: s.employee.id,
      name: s.employee.name,
      revenue: 0,
      sales: 0,
    };
    emp.revenue += s.total;
    emp.sales += 1;
    employees.set(s.employee.id, emp);

    // O desconto da venda é dividido entre os itens na proporção do valor de cada um.
    const gross = s.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0) || 1;
    for (const i of s.items) {
      const value = Math.round((i.unitPrice * i.qty * s.total) / gross);
      const p = products.get(i.productId) ?? {
        productId: i.productId,
        name: i.name,
        qty: 0,
        revenue: 0,
      };
      p.qty += i.qty;
      p.revenue += value;
      products.set(i.productId, p);
      categories.set(i.category, (categories.get(i.category) ?? 0) + value);
    }
  }

  const byRevenue = <T extends { revenue: number }>(a: T, b: T) => b.revenue - a.revenue;
  return {
    days,
    from: (input.from ?? new Date(end.getTime() - days * 86_400_000)).toISOString(),
    to: end.toISOString(),
    revenue,
    sales: sales.length,
    averageTicket: sales.length ? Math.round(revenue / sales.length) : 0,
    grossProfit,
    revenueChange:
      previousRevenue > 0
        ? Math.round(((revenue - previousRevenue) / previousRevenue) * 1000) / 10
        : null,
    byDay: revenueByDay(sales, end, days, timeZone),
    topProducts: [...products.values()].sort(byRevenue).slice(0, 8),
    byCategory: [...categories.entries()]
      .map(([category, value]) => ({ category, revenue: value }))
      .sort(byRevenue),
    byPayment: [...payments.values()].sort(byRevenue),
    byEmployee: [...employees.values()].sort(byRevenue),
  };
}

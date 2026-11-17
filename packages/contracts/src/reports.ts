import { z } from 'zod';

import type { Category } from './catalog.js';
import type { Payment, Sale } from './sales.js';

export const reportQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((d) => [7, 30, 90].includes(d), '7, 30 ou 90')
    .default(30),
});

export type DayPoint = { day: string; revenue: number; sales: number };

export type Report = {
  days: number;
  from: string;
  to: string;
  revenue: number;
  sales: number;
  averageTicket: number;
  /** Lucro bruto: preço − custo dos itens vendidos, menos descontos. */
  grossProfit: number;
  /** Variação da receita em relação ao período anterior, em pontos percentuais (null sem base). */
  revenueChange: number | null;
  byDay: DayPoint[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  byCategory: { category: Category; revenue: number }[];
  byPayment: { payment: Payment; revenue: number; sales: number }[];
  byEmployee: { employeeId: string; name: string; revenue: number; sales: number }[];
};

export type Dashboard = {
  today: { revenue: number; sales: number };
  month: { revenue: number; sales: number; averageTicket: number };
  clients: number;
  lowStock: { id: string; name: string; stock: number; minStock: number }[];
  last14Days: DayPoint[];
  recentSales: Sale[];
};

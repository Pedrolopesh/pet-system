import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { type Dashboard, type Report, reportQuerySchema } from '@petsystem/contracts';
import type { z } from 'zod';

import { Clock } from '../../common/clock.js';
import type { Principal } from '../../common/jwt-auth.guard.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { startOfLocalDay, startOfLocalMonth } from '../../common/time.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ENV, type Env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SALE_SELECT, toSale } from '../sales/sales.service.js';
import { buildReport, revenueByDay } from './build-report.js';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async report(shopId: string, days: number): Promise<Report> {
    const end = this.clock.now();
    // Período em dias locais completos: de 00h de (hoje − days + 1) até agora, igual ao gráfico.
    const from = startOfLocalDay(
      new Date(end.getTime() - (days - 1) * 86_400_000),
      this.env.SHOP_TIMEZONE,
    );
    const previousFrom = new Date(from.getTime() - days * 86_400_000);
    const [sales, previous] = await Promise.all([
      this.prisma.sale.findMany({
        where: { shopId, at: { gte: from, lte: end } },
        select: {
          at: true,
          total: true,
          discount: true,
          cost: true,
          payment: true,
          employee: { select: { id: true, name: true } },
          items: {
            select: { productId: true, name: true, category: true, qty: true, unitPrice: true },
          },
        },
      }),
      this.prisma.sale.aggregate({
        where: { shopId, at: { gte: previousFrom, lt: from } },
        _sum: { total: true },
      }),
    ]);
    return buildReport({
      sales,
      previousRevenue: previous._sum.total ?? 0,
      from,
      end,
      days,
      timeZone: this.env.SHOP_TIMEZONE,
    });
  }

  async dashboard(shopId: string): Promise<Dashboard> {
    const now = this.clock.now();
    const tz = this.env.SHOP_TIMEZONE;
    const since14 = startOfLocalDay(new Date(now.getTime() - 13 * 86_400_000), tz);
    const [today, month, clients, products, last14, recent] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { shopId, at: { gte: startOfLocalDay(now, tz) } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { shopId, at: { gte: startOfLocalMonth(now, tz) } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.client.count({ where: { shopId } }),
      this.prisma.product.findMany({
        where: { shopId, active: true, stock: { not: null } },
        select: { id: true, name: true, stock: true, minStock: true },
      }),
      this.prisma.sale.findMany({
        where: { shopId, at: { gte: since14 } },
        select: { at: true, total: true },
      }),
      this.prisma.sale.findMany({
        where: { shopId },
        select: SALE_SELECT,
        orderBy: { at: 'desc' },
        take: 6,
      }),
    ]);
    const monthRevenue = month._sum.total ?? 0;
    return {
      today: { revenue: today._sum.total ?? 0, sales: today._count },
      month: {
        revenue: monthRevenue,
        sales: month._count,
        averageTicket: month._count ? Math.round(monthRevenue / month._count) : 0,
      },
      clients,
      lowStock: products
        .filter((p) => p.stock !== null && p.stock <= p.minStock)
        .map((p) => ({ id: p.id, name: p.name, stock: p.stock!, minStock: p.minStock }))
        .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock)),
      last14Days: revenueByDay(
        last14.map((s) => ({
          ...s,
          discount: 0,
          cost: 0,
          payment: 'pix',
          employee: { id: '', name: '' },
          items: [],
        })),
        now,
        14,
        tz,
      ),
      recentSales: recent.map(toSale),
    };
  }
}

@Controller()
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get('reports')
  report(
    @CurrentPrincipal() p: Principal,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: z.infer<typeof reportQuerySchema>,
  ): Promise<Report> {
    return this.reports.report(p.shopId, query.days);
  }

  @Get('dashboard')
  dashboard(@CurrentPrincipal() p: Principal): Promise<Dashboard> {
    return this.reports.dashboard(p.shopId);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}

import { Inject, Injectable } from '@nestjs/common';
import type { Employee, employeeInputSchema } from '@petsystem/contracts';
import type { z } from 'zod';

import { Clock } from '../../common/clock.js';
import { notFound } from '../../common/not-found.js';
import { startOfLocalMonth } from '../../common/time.js';
import { ENV, type Env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PlansService } from '../account/plans.service.js';

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
    @Inject(PlansService) private readonly plans: PlansService,
  ) {}

  async list(shopId: string): Promise<Employee[]> {
    const monthStart = startOfLocalMonth(this.clock.now(), this.env.SHOP_TIMEZONE);
    const [employees, totals] = await Promise.all([
      this.prisma.employee.findMany({
        where: { shopId },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.sale.groupBy({
        by: ['employeeId'],
        where: { shopId, at: { gte: monthStart } },
        _count: true,
        _sum: { total: true },
      }),
    ]);
    const byId = new Map(totals.map((t) => [t.employeeId, t]));
    return employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      active: e.active,
      salesThisMonth: byId.get(e.id)?._count ?? 0,
      revenueThisMonth: byId.get(e.id)?._sum.total ?? 0,
    }));
  }

  async create(shopId: string, input: z.infer<typeof employeeInputSchema>): Promise<Employee> {
    if (input.active) await this.plans.assertRoom(shopId, 'professionals');
    const e = await this.prisma.employee.create({ data: { ...input, shopId } });
    return {
      id: e.id,
      name: e.name,
      role: e.role,
      active: e.active,
      salesThisMonth: 0,
      revenueThisMonth: 0,
    };
  }

  async update(
    shopId: string,
    id: string,
    input: z.infer<typeof employeeInputSchema>,
  ): Promise<Employee> {
    const { count } = await this.prisma.employee.updateMany({ where: { id, shopId }, data: input });
    if (count !== 1) throw notFound('Funcionário');
    return (await this.list(shopId)).find((e) => e.id === id)!;
  }
}

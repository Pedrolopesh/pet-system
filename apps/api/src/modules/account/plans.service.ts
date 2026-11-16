import { Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES, type Plan, PLAN_LIMITS } from '@petsystem/contracts';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Plano que vale agora: o teste vencido passa a valer como Básico até a loja escolher um plano. */
export function effectivePlan(shop: { plan: Plan; trialEndsAt: Date | null }, now: Date): Plan {
  if (shop.plan === 'teste' && shop.trialEndsAt && shop.trialEndsAt <= now) return 'basico';
  return shop.plan;
}

@Injectable()
export class PlansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async planOf(shopId: string): Promise<Plan> {
    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { plan: true, trialEndsAt: true },
    });
    return effectivePlan(shop, this.clock.now());
  }

  /** Confere se cabe mais um usuário ou profissional no plano. */
  async assertRoom(shopId: string, what: 'users' | 'professionals'): Promise<void> {
    const limit = PLAN_LIMITS[await this.planOf(shopId)][what];
    if (limit === null) return;
    const used =
      what === 'users'
        ? await this.prisma.user.count({ where: { shopId } })
        : await this.prisma.employee.count({ where: { shopId, active: true } });
    if (used >= limit) {
      const label = what === 'users' ? 'usuários' : 'profissionais ativos';
      throw new AppError(
        403,
        ERROR_CODES.PLAN_LIMIT,
        `O plano atual permite até ${limit} ${label}`,
        {
          limit,
          what,
        },
      );
    }
  }

  async assertReports(shopId: string): Promise<void> {
    if (!PLAN_LIMITS[await this.planOf(shopId)].reports) {
      throw new AppError(
        403,
        ERROR_CODES.PLAN_LIMIT,
        'Relatórios completos fazem parte do plano Pro',
        {
          what: 'reports',
        },
      );
    }
  }
}

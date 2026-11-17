import { randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Clock } from '../../common/clock.js';
import { ENV, type Env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { hashPassword } from '../auth/passwords.js';
import { SampleDataService } from './sample-data.service.js';

/** E-mail reservado da conta de demonstração (não dá para cadastrar nem logar com senha). */
export const DEMO_EMAIL = 'demo@petsystem.invalid';

/**
 * Loja de demonstração pública. Qualquer pessoa entra sem senha e pode mexer à vontade: os dados
 * voltam ao estado de exemplo todo dia de madrugada.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private creating: Promise<string> | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SampleDataService) private readonly samples: SampleDataService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async ensureDemoUser(): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      select: { id: true },
    });
    if (user) return user.id;
    // Várias pessoas entrando ao mesmo tempo na primeira vez: cria uma só.
    this.creating ??= this.createDemo().finally(() => (this.creating = null));
    return this.creating;
  }

  private async createDemo(): Promise<string> {
    // Senha aleatória descartada: ninguém entra na demo por senha, só pela rota pública.
    const passwordHash = await hashPassword(randomBytes(32).toString('base64url'));
    const shop = await this.prisma.shop.create({
      data: {
        name: 'Patas & Cia',
        isDemo: true,
        businessTypes: ['petshop', 'creche', 'clinica'],
        slug: 'patas-e-cia',
        bookingEnabled: true,
        users: { create: { name: 'Visitante', email: DEMO_EMAIL, passwordHash } },
      },
      include: { users: { select: { id: true } } },
    });
    await this.samples.fill(shop.id, this.clock.now());
    return shop.users[0]!.id;
  }

  /** Apaga os dados da loja demo e gera de novo (as sessões abertas continuam valendo). */
  async reset(): Promise<void> {
    const shop = await this.prisma.shop.findFirst({
      where: { isDemo: true },
      select: { id: true },
    });
    if (!shop) return;
    await this.prisma.$transaction([
      this.prisma.vaccination.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.medicalRecord.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.appointment.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.sale.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.stockMovement.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.product.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.client.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.employee.deleteMany({ where: { shopId: shop.id } }),
      this.prisma.note.deleteMany({ where: { shopId: shop.id } }),
    ]);
    await this.samples.fill(shop.id, this.clock.now());
  }

  @Cron('0 4 * * *', { timeZone: 'America/Sao_Paulo' })
  async dailyReset(): Promise<void> {
    if (!this.env.DEMO_DAILY_RESET) return;
    await this.reset();
    this.logger.log('Loja demo restaurada');
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  type AuthResponse,
  ERROR_CODES,
  type InviteAccept,
  type LoginInput,
  type Me,
  type signupSchema,
  slugify,
  TRIAL_DAYS,
  type UserRole,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sha256 } from '../account/account.service.js';
import { PlansService } from '../account/plans.service.js';
import { SHOP_SELECT, toShop } from '../account/shop-view.js';
import { DEMO_EMAIL, DemoService } from '../demo/demo.service.js';
import { SampleDataService } from '../demo/sample-data.service.js';
import { dummyHash, hashPassword, verifyPassword } from './passwords.js';
import { TokensService } from './tokens.service.js';

const invalidInvite = (): AppError =>
  new AppError(400, ERROR_CODES.INVALID_INVITE, 'Convite inválido, expirado ou já usado');

const invalidCredentials = (): AppError =>
  new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, 'E-mail ou senha incorretos');

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(SampleDataService) private readonly samples: SampleDataService,
    @Inject(DemoService) private readonly demo: DemoService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PlansService) private readonly plans: PlansService,
  ) {}

  /** Cria a loja e a conta do dono. Opcionalmente já com dados de exemplo. */
  async signup(input: z.infer<typeof signupSchema>): Promise<AuthResponse> {
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (exists || input.email === DEMO_EMAIL) {
      throw new AppError(409, ERROR_CODES.EMAIL_TAKEN, 'Este e-mail já tem uma conta');
    }
    const passwordHash = await hashPassword(input.password);
    let userId: string;
    try {
      const shop = await this.prisma.shop.create({
        data: {
          name: input.shopName,
          slug: await this.freeSlug(input.shopName),
          businessTypes: input.businessTypes,
          trialEndsAt: new Date(this.clock.now().getTime() + TRIAL_DAYS * 86_400_000),
          users: { create: { name: input.name, email: input.email, passwordHash, role: 'dono' } },
        },
        include: { users: { select: { id: true } } },
      });
      userId = shop.users[0]!.id;
      if (input.withSampleData)
        await this.samples.fill(shop.id, this.clock.now(), input.businessTypes);
    } catch (error) {
      // Corrida: dois cadastros com o mesmo e-mail ao mesmo tempo.
      if ((error as { code?: unknown }).code === 'P2002') {
        throw new AppError(409, ERROR_CODES.EMAIL_TAKEN, 'Este e-mail já tem uma conta');
      }
      throw error;
    }
    return this.session(userId);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true },
    });
    // Mesmo trabalho com ou sem conta: o tempo de resposta não revela e-mails cadastrados.
    const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), input.password);
    if (!user || !ok) throw invalidCredentials();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: this.clock.now() },
    });
    return this.session(user.id);
  }

  /** Entra na loja de demonstração (pública, sem senha). Cria a loja na primeira vez. */
  async loginDemo(): Promise<AuthResponse> {
    const userId = await this.demo.ensureDemoUser();
    return this.session(userId);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const { userId, tokens } = await this.tokens.rotate(refreshToken);
    return { ...tokens, ...(await this.me(userId)) };
  }

  logout(sessionId: string): Promise<void> {
    return this.tokens.revokeSession(sessionId);
  }

  async me(userId: string): Promise<Me> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, shop: { select: SHOP_SELECT } },
    });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      shop: toShop(user.shop),
    };
  }

  /** Mostra para quem recebeu o link qual loja está convidando (sem revelar mais nada). */
  async invitePreview(token: string): Promise<{ shopName: string; role: UserRole }> {
    const invite = await this.validInvite(token);
    return { shopName: invite.shop.name, role: invite.role };
  }

  /** Aceita o convite: cria a conta na loja com o papel do convite. O link vale uma vez. */
  async acceptInvite(input: InviteAccept): Promise<AuthResponse> {
    const invite = await this.validInvite(input.token);
    await this.plans.assertRoom(invite.shopId, 'users');
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (exists || input.email === DEMO_EMAIL) {
      throw new AppError(409, ERROR_CODES.EMAIL_TAKEN, 'Este e-mail já tem uma conta');
    }
    const passwordHash = await hashPassword(input.password);
    const now = this.clock.now();
    const userId = await this.prisma.$transaction(async (tx) => {
      // Marca como usado só se ainda estiver livre: dois aceites do mesmo link não passam.
      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw invalidInvite();
      const user = await tx.user.create({
        data: {
          shopId: invite.shopId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: invite.role,
        },
      });
      return user.id;
    });
    return this.session(userId);
  }

  private async validInvite(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: sha256(token) },
      include: { shop: { select: { name: true } } },
    });
    if (!invite || invite.usedAt || invite.expiresAt <= this.clock.now()) throw invalidInvite();
    return invite;
  }

  /** Endereço público livre: o nome da loja e, se já existir, um número no fim. */
  private async freeSlug(name: string): Promise<string> {
    const base = slugify(name);
    for (let n = 0; n < 50; n++) {
      const candidate = n === 0 ? base : `${base.slice(0, 36)}-${n + 1}`;
      const taken = await this.prisma.shop.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    return `${base.slice(0, 30)}-${Date.now().toString(36)}`;
  }

  private async session(userId: string): Promise<AuthResponse> {
    const tokens = await this.tokens.issue(userId);
    return { ...tokens, ...(await this.me(userId)) };
  }
}

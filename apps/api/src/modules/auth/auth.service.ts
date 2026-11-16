import { Inject, Injectable } from '@nestjs/common';
import {
  type AuthResponse,
  ERROR_CODES,
  type LoginInput,
  type Me,
  type signupSchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DEMO_EMAIL, DemoService } from '../demo/demo.service.js';
import { SampleDataService } from '../demo/sample-data.service.js';
import { dummyHash, hashPassword, verifyPassword } from './passwords.js';
import { TokensService } from './tokens.service.js';

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
          users: { create: { name: input.name, email: input.email, passwordHash } },
        },
        include: { users: { select: { id: true } } },
      });
      userId = shop.users[0]!.id;
      if (input.withSampleData) await this.samples.fill(shop.id, this.clock.now());
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
      select: {
        id: true,
        name: true,
        email: true,
        shop: { select: { id: true, name: true, isDemo: true } },
      },
    });
    return { user: { id: user.id, name: user.name, email: user.email }, shop: user.shop };
  }

  private async session(userId: string): Promise<AuthResponse> {
    const tokens = await this.tokens.issue(userId);
    return { ...tokens, ...(await this.me(userId)) };
  }
}

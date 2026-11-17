import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import {
  type Account,
  type BookingSettings,
  ERROR_CODES,
  type InviteLink,
  type Shop,
  type ShopSettings,
  type UserRole,
} from '@petsystem/contracts';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { defined } from '../../common/defined.js';
import type { Principal } from '../../common/jwt-auth.guard.js';
import { notFound } from '../../common/not-found.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PlansService } from './plans.service.js';
import { SHOP_SELECT, toShop } from './shop-view.js';

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const INVITE_DAYS = 7;

const demoReadOnly = (): AppError =>
  new AppError(403, ERROR_CODES.DEMO_READ_ONLY, 'Na loja de demonstração isso fica desligado');

@Injectable()
export class AccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlansService) private readonly plans: PlansService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async get(shopId: string): Promise<Account> {
    const now = this.clock.now();
    const [shop, members, invites, professionals] = await Promise.all([
      this.prisma.shop.findUniqueOrThrow({ where: { id: shopId }, select: SHOP_SELECT }),
      this.prisma.user.findMany({
        where: { shopId },
        select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.invite.findMany({
        where: { shopId, usedAt: null, expiresAt: { gt: now } },
        select: { id: true, role: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where: { shopId, active: true } }),
    ]);
    return {
      shop: toShop(shop),
      members: members.map((m) => ({ ...m, lastLoginAt: m.lastLoginAt?.toISOString() ?? null })),
      invites: invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
      usage: { users: members.length, professionals },
    };
  }

  async updateShop(p: Principal, input: ShopSettings): Promise<Shop> {
    const shop = await this.prisma.shop.update({
      where: { id: p.shopId },
      data: defined(input),
      select: SHOP_SELECT,
    });
    return toShop(shop);
  }

  /** Agendamento online: endereço público, liga/desliga e prazos. */
  async updateBooking(p: Principal, input: BookingSettings): Promise<Shop> {
    // Na demo o link é público e compartilhado: ninguém troca o endereço nem desliga.
    if (p.isDemo) throw demoReadOnly();
    try {
      const shop = await this.prisma.shop.update({
        where: { id: p.shopId },
        data: defined(input),
        select: SHOP_SELECT,
      });
      return toShop(shop);
    } catch (error) {
      if ((error as { code?: unknown }).code === 'P2002') {
        throw new AppError(
          409,
          ERROR_CODES.SLUG_TAKEN,
          'Esse endereço já está em uso por outra loja',
        );
      }
      throw error;
    }
  }

  /** Troca de plano. A cobrança ainda não está ligada: aqui só muda o plano e os limites. */
  async changePlan(p: Principal, plan: 'basico' | 'pro'): Promise<Shop> {
    if (p.isDemo) throw demoReadOnly();
    if (plan === 'basico') {
      const [users, professionals] = await Promise.all([
        this.prisma.user.count({ where: { shopId: p.shopId } }),
        this.prisma.employee.count({ where: { shopId: p.shopId, active: true } }),
      ]);
      if (users > 2 || professionals > 3) {
        throw new AppError(
          409,
          ERROR_CODES.PLAN_LIMIT,
          'Para ir ao Básico, deixe no máximo 2 usuários e 3 profissionais ativos',
        );
      }
    }
    const shop = await this.prisma.shop.update({
      where: { id: p.shopId },
      data: { plan, trialEndsAt: null },
      select: SHOP_SELECT,
    });
    return toShop(shop);
  }

  /** Gera um link de convite. O token só aparece agora; no banco fica o hash. */
  async createInvite(p: Principal, role: Exclude<UserRole, 'dono'>): Promise<InviteLink> {
    if (p.isDemo) throw demoReadOnly();
    await this.plans.assertRoom(p.shopId, 'users');
    const token = randomBytes(24).toString('base64url');
    const invite = await this.prisma.invite.create({
      data: {
        shopId: p.shopId,
        role,
        tokenHash: sha256(token),
        expiresAt: new Date(this.clock.now().getTime() + INVITE_DAYS * 86_400_000),
      },
    });
    return { id: invite.id, role, token, expiresAt: invite.expiresAt.toISOString() };
  }

  async revokeInvite(p: Principal, id: string): Promise<void> {
    const { count } = await this.prisma.invite.deleteMany({
      where: { id, shopId: p.shopId, usedAt: null },
    });
    if (count !== 1) throw notFound('Convite');
  }

  async changeRole(p: Principal, userId: string, role: Exclude<UserRole, 'dono'>): Promise<void> {
    const member = await this.prisma.user.findFirst({ where: { id: userId, shopId: p.shopId } });
    if (!member) throw notFound('Pessoa');
    if (member.role === 'dono') {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'O papel do dono não pode ser trocado');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { role } });
  }

  /** Remove a pessoa da loja e encerra as sessões dela. O dono não pode ser removido. */
  async removeMember(p: Principal, userId: string): Promise<void> {
    const member = await this.prisma.user.findFirst({ where: { id: userId, shopId: p.shopId } });
    if (!member) throw notFound('Pessoa');
    if (member.role === 'dono') {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'O dono da loja não pode ser removido');
    }
    await this.prisma.user.delete({ where: { id: userId } });
  }
}

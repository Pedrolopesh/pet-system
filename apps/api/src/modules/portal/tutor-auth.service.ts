import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES, type TutorSession } from '@petsystem/contracts';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { Mailer } from '../../common/mailer.js';
import { ENV, type Env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityService } from './availability.service.js';

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
/** No máximo 3 códigos por e-mail a cada 15 minutos (o resto é ignorado em silêncio). */
const MAX_CODES = 3;
export const TUTOR_AUDIENCE = 'petsystem-tutor';
export const TUTOR_TTL_SECONDS = 7 * 86_400;

const hash = (shopId: string, email: string, code: string): string =>
  createHash('sha256').update(`${shopId}:${email}:${code}`).digest('hex');

const invalidCode = (): AppError =>
  new AppError(400, ERROR_CODES.INVALID_CODE, 'Código inválido ou vencido. Peça um novo.');

export type TutorClaims = { shopId: string; clientId: string | null; email: string };

/** Login do tutor sem senha: código de 6 dígitos por e-mail, e um token só do portal. */
@Injectable()
export class TutorAuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Mailer) private readonly mailer: Mailer,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Sempre responde igual, exista ou não o e-mail: não revela quem é cliente da loja. */
  async requestCode(slug: string, email: string): Promise<void> {
    const shop = await this.availability.shopBySlug(slug);
    const now = this.clock.now();
    const recent = await this.prisma.tutorLoginCode.count({
      where: { shopId: shop.id, email, createdAt: { gt: new Date(now.getTime() - 15 * 60_000) } },
    });
    if (recent >= MAX_CODES) return;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.tutorLoginCode.create({
      data: {
        shopId: shop.id,
        email,
        codeHash: hash(shop.id, email, code),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        createdAt: now,
      },
    });
    this.mailer.sendInBackground({
      to: email,
      subject: `Seu código de acesso: ${code}`,
      text: `Seu código para entrar no portal de ${shop.name} é ${code}. Ele vale por 10 minutos.\n\nSe não foi você, ignore este e-mail.`,
    });
  }

  async verify(slug: string, email: string, code: string): Promise<TutorSession> {
    const shop = await this.availability.shopBySlug(slug);
    const now = this.clock.now();
    const stored = await this.prisma.tutorLoginCode.findFirst({
      where: { shopId: shop.id, email, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!stored) throw invalidCode();
    // Conta a tentativa antes de comparar, de forma condicional: o limite vale mesmo em paralelo.
    const counted = await this.prisma.tutorLoginCode.updateMany({
      where: { id: stored.id, attempts: { lt: MAX_ATTEMPTS }, usedAt: null },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count !== 1) throw invalidCode();
    const expected = Buffer.from(stored.codeHash, 'hex');
    const received = Buffer.from(hash(shop.id, email, code), 'hex');
    if (!timingSafeEqual(expected, received)) throw invalidCode();
    const used = await this.prisma.tutorLoginCode.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: now },
    });
    if (used.count !== 1) throw invalidCode();

    const client = await this.prisma.client.findFirst({
      where: { shopId: shop.id, email },
      orderBy: { createdAt: 'asc' },
    });
    return this.issue({ shopId: shop.id, clientId: client?.id ?? null, email });
  }

  /** Só na loja de demonstração: entra como um tutor de exemplo, sem e-mail. */
  async demoLogin(slug: string): Promise<TutorSession> {
    const shop = await this.availability.shopBySlug(slug);
    if (!shop.isDemo)
      throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Disponível só na demonstração');
    const client = await this.prisma.client.findFirst({
      where: { shopId: shop.id, email: { not: '' } },
      orderBy: { name: 'asc' },
    });
    if (!client) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Demonstração sem clientes');
    return this.issue({ shopId: shop.id, clientId: client.id, email: client.email });
  }

  async issue(claims: TutorClaims): Promise<TutorSession> {
    const token = await this.jwt.signAsync(
      {
        shop: claims.shopId,
        email: claims.email,
        ...(claims.clientId ? { sub: claims.clientId } : {}),
      },
      { expiresIn: TUTOR_TTL_SECONDS, issuer: this.env.JWT_ISSUER, audience: TUTOR_AUDIENCE },
    );
    return { token, expiresIn: TUTOR_TTL_SECONDS, registered: Boolean(claims.clientId) };
  }

  async verifyToken(token: string): Promise<TutorClaims> {
    const payload = await this.jwt.verifyAsync<{ sub?: string; shop?: string; email?: string }>(
      token,
      {
        secret: this.env.JWT_ACCESS_SECRET,
        algorithms: ['HS256'],
        issuer: this.env.JWT_ISSUER,
        audience: TUTOR_AUDIENCE,
      },
    );
    if (!payload.shop || !payload.email) throw new Error('token incompleto');
    return { shopId: payload.shop, clientId: payload.sub ?? null, email: payload.email };
  }
}

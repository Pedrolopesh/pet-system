import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type AuthTokens, ERROR_CODES } from '@petsystem/contracts';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { ENV, type Env } from '../../config/env.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const ID = /^[0-9a-f-]{36}$/;

const unauthorized = (): AppError =>
  new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Sessão inválida ou expirada');

/**
 * Access token (JWT curto) e refresh token (opaco, rotativo). Só o hash do refresh fica no banco.
 * Reusar um refresh já trocado é sinal de roubo: a sessão inteira (família) é encerrada.
 */
@Injectable()
export class TokensService {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Novo par de tokens. Sem `familyId`, abre uma sessão nova (login). */
  async issue(userId: string, familyId: string = randomUUID()): Promise<AuthTokens> {
    const refreshToken = await this.createRefreshToken(this.prisma, userId, familyId);
    return { ...(await this.signAccessToken(userId, familyId)), refreshToken };
  }

  private async createRefreshToken(
    db: Pick<Prisma.TransactionClient, 'refreshToken'>,
    userId: string,
    familyId: string,
  ): Promise<string> {
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    await db.refreshToken.create({
      data: {
        id,
        userId,
        familyId,
        tokenHash: sha256(secret),
        expiresAt: new Date(
          this.clock.now().getTime() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
        ),
      },
    });
    return `${id}.${secret}`;
  }

  private async signAccessToken(
    userId: string,
    familyId: string,
  ): Promise<Omit<AuthTokens, 'refreshToken'>> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: familyId },
      {
        expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
      },
    );
    return { accessToken, expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS };
  }

  async verifyAccessToken(token: string): Promise<{ userId: string; sessionId: string }> {
    const payload = await this.jwt.verifyAsync<{ sub?: string; sid?: string }>(token, {
      secret: this.env.JWT_ACCESS_SECRET,
      algorithms: ['HS256'],
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
    });
    if (!payload.sub || !payload.sid) throw new Error('token incompleto');
    return { userId: payload.sub, sessionId: payload.sid };
  }

  /** Troca um refresh válido por um par novo (rotação). */
  async rotate(refreshToken: string): Promise<{ userId: string; tokens: AuthTokens }> {
    const [id, secret] = refreshToken.split('.');
    if (!id || !secret || !ID.test(id)) throw unauthorized();

    const stored = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!stored) throw unauthorized();

    const expected = Buffer.from(stored.tokenHash, 'hex');
    const received = Buffer.from(sha256(secret), 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw unauthorized();
    }
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw unauthorized();
    }
    const now = this.clock.now();
    if (stored.expiresAt <= now) throw unauthorized();

    // UPDATE condicional: entre requisições simultâneas com o mesmo token, só UMA passa.
    const next = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (claimed.count !== 1) return null;
      return this.createRefreshToken(tx, stored.userId, stored.familyId);
    });
    if (!next) {
      await this.revokeFamily(stored.familyId);
      throw unauthorized();
    }
    const access = await this.signAccessToken(stored.userId, stored.familyId);
    return { userId: stored.userId, tokens: { ...access, refreshToken: next } };
  }

  /** Logout: encerra a sessão do token. Silencioso se o token for inválido. */
  async revokeSession(sessionId: string): Promise<void> {
    await this.revokeFamily(sessionId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }

  /** Limpa tokens vencidos há mais de um dia (rodado pela rotina diária). */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(this.clock.now().getTime() - 86_400_000);
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    return count;
  }
}

import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, ERROR_CODES, type PERMISSIONS, type UserRole } from '@petsystem/contracts';
import type { Request } from 'express';

import { TokensService } from '../modules/auth/tokens.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppError } from './app-error.js';
import { PERMISSION_KEY } from './permission.decorator.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Principal = {
  userId: string;
  shopId: string;
  role: UserRole;
  isDemo: boolean;
  sessionId: string;
};
export type AuthenticatedRequest = Request & { user: Principal };

/**
 * Guard global: toda rota nasce protegida. Valida o JWT e confere que a conta e a sessão ainda
 * existem. A loja (shopId) vem do banco, nunca do token nem do corpo da requisição.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Não autenticado');

    let userId: string;
    let sessionId: string;
    try {
      const verified = await this.tokens.verifyAccessToken(token);
      if (!UUID.test(verified.userId) || !UUID.test(verified.sessionId))
        throw new Error('id inválido');
      userId = verified.userId;
      sessionId = verified.sessionId;
    } catch {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Não autenticado');
    }

    // Encerrar a sessão (logout) derruba o token na hora, sem esperar ele expirar.
    const user = await this.prisma.user.findFirst({
      where: { id: userId, refreshTokens: { some: { familyId: sessionId, revokedAt: null } } },
      select: { id: true, shopId: true, role: true, shop: { select: { isDemo: true } } },
    });
    if (!user) throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Não autenticado');
    request.user = {
      userId: user.id,
      shopId: user.shopId,
      role: user.role,
      isDemo: user.shop.isDemo,
      sessionId,
    };

    // Permissão do papel (dono, gerente, atendente), quando a rota exige.
    const action = this.reflector.getAllAndOverride<keyof typeof PERMISSIONS | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (action && !can(user.role, action)) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Seu perfil não tem permissão para isso');
    }
    return true;
  }
}

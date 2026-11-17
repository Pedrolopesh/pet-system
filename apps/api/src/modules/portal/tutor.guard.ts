import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ERROR_CODES } from '@petsystem/contracts';
import type { Request } from 'express';

import { AppError } from '../../common/app-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TutorAuthService,type TutorClaims } from './tutor-auth.service.js';

type TutorRequest = Request & { tutor: TutorClaims };

/**
 * Guard das rotas do tutor. O token do portal tem outra "audience": não serve para a área da loja,
 * e o da loja não serve aqui. Confere que o cliente ainda existe e que a loja segue com agendamento online.
 */
@Injectable()
export class TutorGuard implements CanActivate {
  constructor(
    @Inject(TutorAuthService) private readonly auth: TutorAuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<TutorRequest>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const unauthorized = new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Entre de novo no portal');
    if (!token) throw unauthorized;
    let claims: TutorClaims;
    try {
      claims = await this.auth.verifyToken(token);
    } catch {
      throw unauthorized;
    }
    const shop = await this.prisma.shop.findUnique({
      where: { id: claims.shopId },
      select: { bookingEnabled: true },
    });
    if (!shop?.bookingEnabled) throw unauthorized;
    if (claims.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: claims.clientId, shopId: claims.shopId },
        select: { id: true },
      });
      if (!client) throw unauthorized;
    }
    req.tutor = claims;
    return true;
  }
}

export const CurrentTutor = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): TutorClaims =>
    ctx.switchToHttp().getRequest<TutorRequest>().tutor,
);

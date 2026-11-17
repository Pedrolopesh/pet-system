import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest, Principal } from './jwt-auth.guard.js';

/** Quem está chamando: usuário, loja e sessão (vem do JWT validado, nunca do corpo). */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

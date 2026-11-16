import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  type AuthResponse,
  inviteAcceptSchema,
  loginSchema,
  type Me,
  refreshSchema,
  signupSchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { Public } from '../../common/public.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  signup(
    @Body(new ZodValidationPipe(signupSchema)) body: z.infer<typeof signupSchema>,
  ): Promise<AuthResponse> {
    return this.auth.signup(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
  ): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Public()
  @Post('demo')
  @HttpCode(200)
  // A demo é pública: limite próprio, mais folgado que o de senha, mas ainda por IP.
  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  demo(): Promise<AuthResponse> {
    return this.auth.loginDemo();
  }

  @Public()
  @Get('invites/:token')
  invitePreview(@Param('token') token: string): Promise<{ shopName: string; role: string }> {
    return this.auth.invitePreview(token.slice(0, 100));
  }

  @Public()
  @Post('invites/accept')
  acceptInvite(
    @Body(new ZodValidationPipe(inviteAcceptSchema)) body: z.infer<typeof inviteAcceptSchema>,
  ): Promise<AuthResponse> {
    return this.auth.acceptInvite(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: z.infer<typeof refreshSchema>,
  ): Promise<AuthResponse> {
    return this.auth.refresh(body.refreshToken);
  }

  // Rotas de quem já está logado: só o limite geral (o rígido é para tentativas de login).
  @SkipThrottle({ auth: true })
  @Post('logout')
  @HttpCode(204)
  logout(@CurrentPrincipal() principal: Principal): Promise<void> {
    return this.auth.logout(principal.sessionId);
  }

  @SkipThrottle({ auth: true })
  @Get('me')
  me(@CurrentPrincipal() principal: Principal): Promise<Me> {
    return this.auth.me(principal.userId);
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { JwtAuthGuard } from '../../common/jwt-auth.guard.js';
import { ENV, type Env } from '../../config/env.js';
import { DemoModule } from '../demo/demo.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [
    DemoModule,
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [TokensService],
})
export class AuthModule {}

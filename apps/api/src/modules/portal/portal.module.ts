import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ENV, type Env } from '../../config/env.js';
import { AvailabilityService } from './availability.service.js';
import { PublicShopController, TutorController } from './portal.controller.js';
import { TutorGuard } from './tutor.guard.js';
import { TutorService } from './tutor.service.js';
import { TutorAuthService } from './tutor-auth.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [PublicShopController, TutorController],
  providers: [AvailabilityService, TutorAuthService, TutorService, TutorGuard],
})
export class PortalModule {}

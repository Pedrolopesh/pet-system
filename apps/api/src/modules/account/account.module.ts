import { Global, Module } from '@nestjs/common';

import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { PlansService } from './plans.service.js';

@Global()
@Module({
  controllers: [AccountController],
  providers: [AccountService, PlansService],
  exports: [PlansService],
})
export class AccountModule {}

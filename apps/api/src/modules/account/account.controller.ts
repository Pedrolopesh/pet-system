import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  type Account,
  inviteCreateSchema,
  type InviteLink,
  planChangeSchema,
  type Shop,
  shopSettingsSchema,
} from '@petsystem/contracts';
import { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { RequiresPermission } from '../../common/permission.decorator.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { AccountService } from './account.service.js';

const roleSchema = z.object({ role: z.enum(['gerente', 'atendente']) });

@Controller('account')
export class AccountController {
  constructor(@Inject(AccountService) private readonly account: AccountService) {}

  @Get()
  get(@CurrentPrincipal() p: Principal): Promise<Account> {
    return this.account.get(p.shopId);
  }

  @Patch('shop')
  @RequiresPermission('manageShop')
  updateShop(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(shopSettingsSchema)) body: z.infer<typeof shopSettingsSchema>,
  ): Promise<Shop> {
    return this.account.updateShop(p, body);
  }

  @Post('plan')
  @HttpCode(200)
  @RequiresPermission('manageAccount')
  changePlan(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(planChangeSchema)) body: z.infer<typeof planChangeSchema>,
  ): Promise<Shop> {
    return this.account.changePlan(p, body.plan);
  }

  @Post('invites')
  @RequiresPermission('manageAccount')
  invite(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(inviteCreateSchema)) body: z.infer<typeof inviteCreateSchema>,
  ): Promise<InviteLink> {
    return this.account.createInvite(p, body.role);
  }

  @Delete('invites/:id')
  @HttpCode(204)
  @RequiresPermission('manageAccount')
  revokeInvite(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.account.revokeInvite(p, id);
  }

  @Patch('members/:id')
  @HttpCode(204)
  @RequiresPermission('manageAccount')
  changeRole(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(roleSchema)) body: z.infer<typeof roleSchema>,
  ): Promise<void> {
    return this.account.changeRole(p, id, body.role);
  }

  @Delete('members/:id')
  @HttpCode(204)
  @RequiresPermission('manageAccount')
  removeMember(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.account.removeMember(p, id);
  }
}

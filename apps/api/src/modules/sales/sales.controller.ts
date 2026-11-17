import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { type Page, type Sale, saleInputSchema, saleQuerySchema } from '@petsystem/contracts';
import type { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { SalesService } from './sales.service.js';

@Controller('sales')
export class SalesController {
  constructor(@Inject(SalesService) private readonly sales: SalesService) {}

  @Get()
  list(
    @CurrentPrincipal() p: Principal,
    @Query(new ZodValidationPipe(saleQuerySchema)) query: z.infer<typeof saleQuerySchema>,
  ): Promise<Page<Sale>> {
    return this.sales.list(p.shopId, query);
  }

  @Get(':id')
  get(@CurrentPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string): Promise<Sale> {
    return this.sales.get(p.shopId, id);
  }

  @Post()
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(saleInputSchema)) body: z.infer<typeof saleInputSchema>,
  ): Promise<Sale> {
    return this.sales.create(p.shopId, body);
  }
}

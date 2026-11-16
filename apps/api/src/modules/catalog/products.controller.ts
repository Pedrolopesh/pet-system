import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type Product,
  productInputSchema,
  productQuerySchema,
  productUpdateSchema,
  stockAdjustSchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly products: ProductsService) {}

  @Get()
  list(
    @CurrentPrincipal() p: Principal,
    @Query(new ZodValidationPipe(productQuerySchema)) query: z.infer<typeof productQuerySchema>,
  ): Promise<Product[]> {
    return this.products.list(p.shopId, query);
  }

  @Post()
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(productInputSchema)) body: z.infer<typeof productInputSchema>,
  ): Promise<Product> {
    return this.products.create(p.shopId, body);
  }

  @Patch(':id')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(productUpdateSchema)) body: z.infer<typeof productUpdateSchema>,
  ): Promise<Product> {
    return this.products.update(p.shopId, id, body);
  }

  @Post(':id/stock')
  adjust(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(stockAdjustSchema)) body: z.infer<typeof stockAdjustSchema>,
  ): Promise<Product> {
    return this.products.adjustStock(p.shopId, id, body);
  }
}

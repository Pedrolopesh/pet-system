import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  type Client,
  type ClientDetail,
  clientInputSchema,
  type Employee,
  employeeInputSchema,
} from '@petsystem/contracts';
import { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { RequiresPermission } from '../../common/permission.decorator.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ClientsService } from './clients.service.js';
import { EmployeesService } from './employees.service.js';

const searchSchema = z.object({ q: z.string().trim().max(80).optional() });

@Controller('clients')
export class ClientsController {
  constructor(@Inject(ClientsService) private readonly clients: ClientsService) {}

  @Get()
  list(
    @CurrentPrincipal() p: Principal,
    @Query(new ZodValidationPipe(searchSchema)) query: z.infer<typeof searchSchema>,
  ): Promise<Client[]> {
    return this.clients.list(p.shopId, query.q);
  }

  @Get(':id')
  get(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientDetail> {
    return this.clients.get(p.shopId, id);
  }

  @Post()
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(clientInputSchema)) body: z.infer<typeof clientInputSchema>,
  ): Promise<Client> {
    return this.clients.create(p.shopId, body);
  }

  @Put(':id')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(clientInputSchema)) body: z.infer<typeof clientInputSchema>,
  ): Promise<Client> {
    return this.clients.update(p.shopId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.clients.remove(p.shopId, id);
  }
}

@Controller('employees')
export class EmployeesController {
  constructor(@Inject(EmployeesService) private readonly employees: EmployeesService) {}

  @Get()
  list(@CurrentPrincipal() p: Principal): Promise<Employee[]> {
    return this.employees.list(p.shopId);
  }

  @Post()
  @RequiresPermission('manageShop')
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(employeeInputSchema)) body: z.infer<typeof employeeInputSchema>,
  ): Promise<Employee> {
    return this.employees.create(p.shopId, body);
  }

  @Put(':id')
  @RequiresPermission('manageShop')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(employeeInputSchema)) body: z.infer<typeof employeeInputSchema>,
  ): Promise<Employee> {
    return this.employees.update(p.shopId, id, body);
  }
}

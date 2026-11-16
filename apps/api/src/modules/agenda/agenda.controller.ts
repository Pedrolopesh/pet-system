import {
  Body,
  Controller,
  Get,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  agendaQuerySchema,
  type Appointment,
  appointmentInputSchema,
  appointmentStatusInputSchema,
  appointmentUpdateSchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { AgendaService } from './agenda.service.js';

@Controller('appointments')
export class AgendaController {
  constructor(@Inject(AgendaService) private readonly agenda: AgendaService) {}

  @Get()
  list(
    @CurrentPrincipal() p: Principal,
    @Query(new ZodValidationPipe(agendaQuerySchema)) q: z.infer<typeof agendaQuerySchema>,
  ): Promise<Appointment[]> {
    return this.agenda.list(p.shopId, q.from, q.days, q.employeeId);
  }

  @Get(':id')
  get(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Appointment> {
    return this.agenda.get(p.shopId, id);
  }

  @Post()
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(appointmentInputSchema))
    body: z.infer<typeof appointmentInputSchema>,
  ): Promise<Appointment> {
    return this.agenda.create(p.shopId, body);
  }

  @Patch(':id')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(appointmentUpdateSchema))
    body: z.infer<typeof appointmentUpdateSchema>,
  ): Promise<Appointment> {
    return this.agenda.update(p.shopId, id, body);
  }

  @Post(':id/status')
  status(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(appointmentStatusInputSchema))
    body: z.infer<typeof appointmentStatusInputSchema>,
  ): Promise<Appointment> {
    return this.agenda.setStatus(p.shopId, id, body.status);
  }
}

@Module({ controllers: [AgendaController], providers: [AgendaService] })
export class AgendaModule {}

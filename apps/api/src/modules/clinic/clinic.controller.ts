import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  type ClinicalFile,
  type ClinicalPet,
  dueQuerySchema,
  type DueVaccine,
  type MedicalRecord,
  petHealthSchema,
  type PrescriptionDoc,
  recordInputSchema,
  type Vaccination,
  vaccinationInputSchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import type { Principal } from '../../common/jwt-auth.guard.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ClinicService } from './clinic.service.js';

@Controller()
export class ClinicController {
  constructor(@Inject(ClinicService) private readonly clinic: ClinicService) {}

  @Get('pets/:id/clinical')
  file(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClinicalFile> {
    return this.clinic.file(p.shopId, id);
  }

  @Patch('pets/:id/health')
  health(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(petHealthSchema)) body: z.infer<typeof petHealthSchema>,
  ): Promise<ClinicalPet> {
    return this.clinic.updateHealth(p.shopId, id, body);
  }

  @Post('pets/:id/records')
  createRecord(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(recordInputSchema)) body: z.infer<typeof recordInputSchema>,
  ): Promise<MedicalRecord> {
    return this.clinic.createRecord(p, id, body);
  }

  @Put('records/:id')
  updateRecord(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(recordInputSchema)) body: z.infer<typeof recordInputSchema>,
  ): Promise<MedicalRecord> {
    return this.clinic.updateRecord(p, id, body);
  }

  @Get('records/:id/prescription')
  prescription(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PrescriptionDoc> {
    return this.clinic.prescription(p.shopId, id);
  }

  @Post('pets/:id/vaccinations')
  addVaccination(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(vaccinationInputSchema))
    body: z.infer<typeof vaccinationInputSchema>,
  ): Promise<Vaccination> {
    return this.clinic.addVaccination(p.shopId, id, body);
  }

  @Delete('vaccinations/:id')
  @HttpCode(204)
  removeVaccination(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.clinic.removeVaccination(p.shopId, id);
  }

  @Get('vaccinations/due')
  due(
    @CurrentPrincipal() p: Principal,
    @Query(new ZodValidationPipe(dueQuerySchema)) q: z.infer<typeof dueQuerySchema>,
  ): Promise<DueVaccine[]> {
    return this.clinic.due(p.shopId, q.days);
  }
}

@Module({ controllers: [ClinicController], providers: [ClinicService] })
export class ClinicModule {}

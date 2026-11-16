import { Inject, Injectable } from '@nestjs/common';
import {
  type ClinicalFile,
  type ClinicalPet,
  type DueVaccine,
  ERROR_CODES,
  type MedicalRecord,
  type PetHealth,
  type PrescriptionDoc,
  RECORD_EDIT_HOURS,
  type recordInputSchema,
  type Vaccination,
  type vaccinationInputSchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import type { Principal } from '../../common/jwt-auth.guard.js';
import { notFound } from '../../common/not-found.js';
import { localDay } from '../../common/time.js';
import { ENV, type Env } from '../../config/env.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type RecordInputParsed = z.infer<typeof recordInputSchema>;
type VaccinationParsed = z.infer<typeof vaccinationInputSchema>;

const PET_SELECT = {
  id: true,
  name: true,
  species: true,
  breed: true,
  birthDate: true,
  sex: true,
  neutered: true,
  allergies: true,
  client: { select: { id: true, name: true, phone: true, email: true } },
} satisfies Prisma.PetSelect;

const RECORD_SELECT = {
  id: true,
  kind: true,
  at: true,
  weightGrams: true,
  temperatureDeci: true,
  complaint: true,
  exam: true,
  diagnosis: true,
  treatment: true,
  appointmentId: true,
  createdAt: true,
  vet: { select: { id: true, name: true } },
  author: { select: { id: true, name: true } },
  prescription: {
    select: { medication: true, dosage: true, frequency: true, duration: true, instructions: true },
    orderBy: { position: 'asc' },
  },
} satisfies Prisma.MedicalRecordSelect;

const VACCINE_SELECT = {
  id: true,
  vaccine: true,
  appliedAt: true,
  nextDoseAt: true,
  batch: true,
  createdAt: true,
  vet: { select: { id: true, name: true } },
} satisfies Prisma.VaccinationSelect;

/** Datas @db.Date chegam como meia-noite UTC: a parte da data é o dia certo. */
const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (day: string): Date => new Date(`${day}T00:00:00Z`);

const toPet = (p: Prisma.PetGetPayload<{ select: typeof PET_SELECT }>): ClinicalPet => ({
  ...p,
  birthDate: p.birthDate ? dateOnly(p.birthDate) : null,
});

const locked = (): AppError =>
  new AppError(
    409,
    ERROR_CODES.RECORD_LOCKED,
    `Registros do prontuário só podem ser corrigidos nas primeiras ${RECORD_EDIT_HOURS} horas`,
  );

@Injectable()
export class ClinicService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private toVaccination({
    createdAt,
    ...v
  }: Prisma.VaccinationGetPayload<{ select: typeof VACCINE_SELECT }>): Vaccination {
    return {
      ...v,
      appliedAt: dateOnly(v.appliedAt),
      nextDoseAt: v.nextDoseAt ? dateOnly(v.nextDoseAt) : null,
      removable: this.editable(createdAt),
    };
  }

  private editable(createdAt: Date): boolean {
    return this.clock.now().getTime() - createdAt.getTime() < RECORD_EDIT_HOURS * 3_600_000;
  }

  private toRecord(
    r: Prisma.MedicalRecordGetPayload<{ select: typeof RECORD_SELECT }>,
  ): MedicalRecord {
    return {
      id: r.id,
      kind: r.kind,
      at: r.at.toISOString(),
      weightKg: r.weightGrams === null ? null : r.weightGrams / 1000,
      temperatureC: r.temperatureDeci === null ? null : r.temperatureDeci / 10,
      complaint: r.complaint,
      exam: r.exam,
      diagnosis: r.diagnosis,
      treatment: r.treatment,
      prescription: r.prescription,
      vet: r.vet,
      author: r.author,
      appointmentId: r.appointmentId,
      editable: this.editable(r.createdAt),
    };
  }

  private async petOf(shopId: string, petId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { id: petId, client: { shopId } },
      select: PET_SELECT,
    });
    if (!pet) throw notFound('Pet');
    return pet;
  }

  private async assertRefs(
    shopId: string,
    petId: string,
    vetId: string | null,
    appointmentId?: string | null,
  ) {
    if (vetId) {
      const vet = await this.prisma.employee.findFirst({
        where: { id: vetId, shopId },
        select: { id: true },
      });
      if (!vet) throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Veterinário(a) inválido(a)');
    }
    if (appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: appointmentId, shopId, petId },
        select: { id: true },
      });
      if (!appt)
        throw new AppError(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'Atendimento da agenda inválido para este pet',
        );
    }
  }

  async file(shopId: string, petId: string): Promise<ClinicalFile> {
    const pet = await this.petOf(shopId, petId);
    const [records, vaccinations] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where: { petId, shopId },
        select: RECORD_SELECT,
        orderBy: { at: 'desc' },
      }),
      this.prisma.vaccination.findMany({
        where: { petId, shopId },
        select: VACCINE_SELECT,
        orderBy: { appliedAt: 'desc' },
      }),
    ]);
    const mapped = records.map((r) => this.toRecord(r));
    return {
      pet: toPet(pet),
      records: mapped,
      vaccinations: vaccinations.map((v) => this.toVaccination(v)),
      weights: mapped
        .filter((r) => r.weightKg !== null)
        .map((r) => ({ at: r.at, kg: r.weightKg! }))
        .reverse(),
    };
  }

  async updateHealth(shopId: string, petId: string, input: PetHealth): Promise<ClinicalPet> {
    await this.petOf(shopId, petId);
    const data: Prisma.PetUpdateInput = {};
    if (input.birthDate !== undefined)
      data.birthDate = input.birthDate ? asDate(input.birthDate) : null;
    if (input.sex !== undefined) data.sex = input.sex;
    if (input.neutered !== undefined) data.neutered = input.neutered;
    if (input.allergies !== undefined) data.allergies = input.allergies;
    return toPet(await this.prisma.pet.update({ where: { id: petId }, data, select: PET_SELECT }));
  }

  async createRecord(
    p: Principal,
    petId: string,
    input: RecordInputParsed,
  ): Promise<MedicalRecord> {
    await this.petOf(p.shopId, petId);
    await this.assertRefs(p.shopId, petId, input.vetId, input.appointmentId);
    const row = await this.prisma.medicalRecord.create({
      data: {
        shopId: p.shopId,
        petId,
        vetId: input.vetId,
        authorId: p.userId,
        appointmentId: input.appointmentId,
        kind: input.kind,
        // createdAt pelo mesmo relógio da trava de 24 h (não pelo relógio do banco).
        at: this.clock.now(),
        createdAt: this.clock.now(),
        weightGrams: input.weightKg === null ? null : Math.round(input.weightKg * 1000),
        temperatureDeci: input.temperatureC === null ? null : Math.round(input.temperatureC * 10),
        complaint: input.complaint,
        exam: input.exam,
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        prescription: {
          create: input.prescription.map((item, position) => ({ ...item, position })),
        },
      },
      select: RECORD_SELECT,
    });
    return this.toRecord(row);
  }

  /** Correção dentro da janela: substitui o conteúdo e a receita. O momento do atendimento não muda. */
  async updateRecord(p: Principal, id: string, input: RecordInputParsed): Promise<MedicalRecord> {
    const current = await this.prisma.medicalRecord.findFirst({
      where: { id, shopId: p.shopId },
      select: { petId: true, createdAt: true },
    });
    if (!current) throw notFound('Registro');
    if (!this.editable(current.createdAt)) throw locked();
    await this.assertRefs(p.shopId, current.petId, input.vetId, input.appointmentId);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.prescriptionItem.deleteMany({ where: { recordId: id } });
      return tx.medicalRecord.update({
        where: { id },
        data: {
          kind: input.kind,
          vetId: input.vetId,
          appointmentId: input.appointmentId,
          weightGrams: input.weightKg === null ? null : Math.round(input.weightKg * 1000),
          temperatureDeci: input.temperatureC === null ? null : Math.round(input.temperatureC * 10),
          complaint: input.complaint,
          exam: input.exam,
          diagnosis: input.diagnosis,
          treatment: input.treatment,
          prescription: {
            create: input.prescription.map((item, position) => ({ ...item, position })),
          },
        },
        select: RECORD_SELECT,
      });
    });
    return this.toRecord(row);
  }

  async prescription(shopId: string, id: string): Promise<PrescriptionDoc> {
    const row = await this.prisma.medicalRecord.findFirst({
      where: { id, shopId },
      select: { ...RECORD_SELECT, pet: { select: PET_SELECT }, shop: { select: { name: true } } },
    });
    if (!row) throw notFound('Registro');
    const { pet, shop, ...record } = row;
    return { shop, pet: toPet(pet), record: this.toRecord(record) };
  }

  async addVaccination(
    shopId: string,
    petId: string,
    input: VaccinationParsed,
  ): Promise<Vaccination> {
    await this.petOf(shopId, petId);
    await this.assertRefs(shopId, petId, input.vetId);
    if (input.recordId) {
      const rec = await this.prisma.medicalRecord.findFirst({
        where: { id: input.recordId, shopId, petId },
      });
      if (!rec)
        throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Registro do prontuário inválido');
    }
    const row = await this.prisma.vaccination.create({
      data: {
        shopId,
        petId,
        recordId: input.recordId,
        vetId: input.vetId,
        vaccine: input.vaccine,
        appliedAt: asDate(input.appliedAt),
        nextDoseAt: input.nextDoseAt ? asDate(input.nextDoseAt) : null,
        batch: input.batch,
        createdAt: this.clock.now(),
      },
      select: VACCINE_SELECT,
    });
    return this.toVaccination(row);
  }

  /** Lançamento errado pode ser removido só nas primeiras horas, como o prontuário. */
  async removeVaccination(shopId: string, id: string): Promise<void> {
    const v = await this.prisma.vaccination.findFirst({
      where: { id, shopId },
      select: { createdAt: true },
    });
    if (!v) throw notFound('Vacina');
    if (!this.editable(v.createdAt)) throw locked();
    await this.prisma.vaccination.delete({ where: { id } });
  }

  /**
   * Reforços vencidos e a vencer em `days` dias. Só conta a aplicação mais recente de cada vacina
   * por pet: se o reforço já foi dado, a anterior não aparece mais.
   */
  async due(shopId: string, days: number): Promise<DueVaccine[]> {
    const today = localDay(this.clock.now(), this.env.SHOP_TIMEZONE);
    const limit = new Date(asDate(today).getTime() + days * 86_400_000);
    const candidates = await this.prisma.vaccination.findMany({
      where: { shopId, nextDoseAt: { not: null, lte: limit } },
      select: {
        id: true,
        vaccine: true,
        appliedAt: true,
        nextDoseAt: true,
        petId: true,
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            client: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { nextDoseAt: 'asc' },
    });
    if (!candidates.length) return [];
    const latest = await this.prisma.vaccination.groupBy({
      by: ['petId', 'vaccine'],
      where: { shopId, petId: { in: [...new Set(candidates.map((c) => c.petId))] } },
      _max: { appliedAt: true },
    });
    const newest = new Map(
      latest.map((l) => [`${l.petId}|${l.vaccine}`, l._max.appliedAt?.getTime() ?? 0]),
    );
    return candidates
      .filter((c) => c.appliedAt.getTime() >= (newest.get(`${c.petId}|${c.vaccine}`) ?? 0))
      .map((c) => {
        const next = dateOnly(c.nextDoseAt!);
        return {
          id: c.id,
          vaccine: c.vaccine,
          nextDoseAt: next,
          overdue: next < today,
          pet: { id: c.pet.id, name: c.pet.name, species: c.pet.species },
          client: c.pet.client,
        };
      });
  }
}

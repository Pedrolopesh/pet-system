import { Inject, Injectable } from '@nestjs/common';
import {
  type Appointment,
  type appointmentInputSchema,
  type AppointmentStatus,
  type AppointmentUpdate,
  BLOCKING_STATUSES,
  canMove,
  ERROR_CODES,
  FINAL_STATUSES,
  LABELS,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { notFound } from '../../common/not-found.js';
import { startOfLocalDay } from '../../common/time.js';
import { ENV, type Env } from '../../config/env.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export const APPOINTMENT_SELECT = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  price: true,
  notes: true,
  saleId: true,
  client: { select: { id: true, name: true, phone: true } },
  pet: { select: { id: true, name: true, species: true, breed: true } },
  service: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentSelect;

type Row = Prisma.AppointmentGetPayload<{ select: typeof APPOINTMENT_SELECT }>;
export const toAppointment = (a: Row): Appointment => ({
  ...a,
  startsAt: a.startsAt.toISOString(),
  endsAt: a.endsAt.toISOString(),
});

const invalid = (message: string): AppError =>
  new AppError(400, ERROR_CODES.VALIDATION_ERROR, message);

@Injectable()
export class AgendaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Atendimentos de `days` dias locais a partir de `from` (YYYY-MM-DD). */
  async list(
    shopId: string,
    from: string,
    days: number,
    employeeId?: string,
  ): Promise<Appointment[]> {
    const tz = this.env.SHOP_TIMEZONE;
    const start = startOfLocalDay(new Date(`${from}T12:00:00Z`), tz);
    const end = startOfLocalDay(
      new Date(new Date(`${from}T12:00:00Z`).getTime() + days * 86_400_000),
      tz,
    );
    const rows = await this.prisma.appointment.findMany({
      where: { shopId, startsAt: { gte: start, lt: end }, ...(employeeId ? { employeeId } : {}) },
      select: APPOINTMENT_SELECT,
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(toAppointment);
  }

  async create(
    shopId: string,
    input: z.infer<typeof appointmentInputSchema>,
  ): Promise<Appointment> {
    const pet = await this.prisma.pet.findFirst({
      where: { id: input.petId, clientId: input.clientId, client: { shopId } },
      select: { id: true },
    });
    if (!pet) throw invalid('Pet não encontrado para este cliente');
    const service = await this.prisma.product.findFirst({
      where: { id: input.serviceId, shopId, category: 'servico', active: true },
    });
    if (!service) throw invalid('Serviço inválido');
    await this.assertEmployee(shopId, input.employeeId);

    const startsAt = new Date(input.startsAt);
    const minutes = input.durationMinutes ?? service.durationMinutes ?? 60;
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.assertFree(tx, shopId, input.employeeId, startsAt, endsAt);
      return tx.appointment.create({
        data: {
          shopId,
          clientId: input.clientId,
          petId: input.petId,
          serviceId: service.id,
          employeeId: input.employeeId,
          startsAt,
          endsAt,
          price: service.price,
          notes: input.notes,
        },
        select: APPOINTMENT_SELECT,
      });
    });
    return toAppointment(row);
  }

  /** Remarca, troca o profissional ou edita a observação. Atendimento encerrado não muda. */
  async update(shopId: string, id: string, input: AppointmentUpdate): Promise<Appointment> {
    const current = await this.prisma.appointment.findFirst({ where: { id, shopId } });
    if (!current) throw notFound('Atendimento');
    if (FINAL_STATUSES.includes(current.status)) {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATUS,
        'Atendimento encerrado não pode ser alterado',
      );
    }
    const employeeId = input.employeeId === undefined ? current.employeeId : input.employeeId;
    if (input.employeeId !== undefined) await this.assertEmployee(shopId, employeeId);
    const startsAt = input.startsAt ? new Date(input.startsAt) : current.startsAt;
    const minutes =
      input.durationMinutes ?? (current.endsAt.getTime() - current.startsAt.getTime()) / 60_000;
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.assertFree(tx, shopId, employeeId, startsAt, endsAt, id);
      return tx.appointment.update({
        where: { id },
        data: {
          employeeId,
          startsAt,
          endsAt,
          ...(input.notes === undefined ? {} : { notes: input.notes }),
        },
        select: APPOINTMENT_SELECT,
      });
    });
    return toAppointment(row);
  }

  /** Avança no fluxo (agendado → confirmado → em atendimento → pronto → concluído) ou cancela. */
  async setStatus(shopId: string, id: string, status: AppointmentStatus): Promise<Appointment> {
    const current = await this.prisma.appointment.findFirst({
      where: { id, shopId },
      select: { status: true },
    });
    if (!current) throw notFound('Atendimento');
    if (!canMove(current.status, status)) {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATUS,
        `Não dá para passar de "${LABELS.status[current.status]}" para "${LABELS.status[status]}"`,
      );
    }
    // Condicional no status de origem: duas mudanças ao mesmo tempo não pulam etapas.
    const { count } = await this.prisma.appointment.updateMany({
      where: { id, shopId, status: current.status },
      data: { status },
    });
    if (count !== 1)
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATUS,
        'O atendimento mudou. Atualize a agenda.',
      );
    return toAppointment(
      await this.prisma.appointment.findUniqueOrThrow({
        where: { id },
        select: APPOINTMENT_SELECT,
      }),
    );
  }

  private async assertEmployee(shopId: string, employeeId: string | null): Promise<void> {
    if (!employeeId) return;
    const ok = await this.prisma.employee.findFirst({
      where: { id: employeeId, shopId, active: true },
    });
    if (!ok) throw invalid('Profissional inválido');
  }

  /**
   * O profissional não pode ter dois atendimentos ao mesmo tempo. A trava (advisory lock) por
   * profissional faz a checagem e a gravação acontecerem uma de cada vez, sem corrida.
   */
  private async assertFree(
    tx: Prisma.TransactionClient,
    shopId: string,
    employeeId: string | null,
    startsAt: Date,
    endsAt: Date,
    ignoreId?: string,
  ): Promise<void> {
    if (!employeeId) return;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))`;
    const clash = await tx.appointment.findFirst({
      where: {
        shopId,
        employeeId,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { startsAt: true, pet: { select: { name: true } } },
    });
    if (clash) {
      throw new AppError(
        409,
        ERROR_CODES.SLOT_TAKEN,
        `O profissional já tem atendimento nesse horário (${clash.pet.name})`,
        {
          startsAt: clash.startsAt.toISOString(),
        },
      );
    }
  }
}

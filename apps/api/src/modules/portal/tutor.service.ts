import { Inject, Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type TutorAppointment,
  type tutorBookingSchema,
  type TutorMe,
  type tutorPetSchema,
  type tutorProfileSchema,
  type TutorSession,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { notFound } from '../../common/not-found.js';
import { localDay } from '../../common/time.js';
import { ENV, type Env } from '../../config/env.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityService } from './availability.service.js';
import { TutorAuthService,type TutorClaims } from './tutor-auth.service.js';

const APPT_SELECT = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  price: true,
  service: { select: { name: true } },
  pet: { select: { id: true, name: true } },
  employee: { select: { name: true } },
} satisfies Prisma.AppointmentSelect;

const needsProfile = (): AppError =>
  new AppError(409, ERROR_CODES.VALIDATION_ERROR, 'Complete o cadastro antes de continuar');

@Injectable()
export class TutorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
    @Inject(TutorAuthService) private readonly auth: TutorAuthService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private clientId(t: TutorClaims): string {
    if (!t.clientId) throw needsProfile();
    return t.clientId;
  }

  private async shop(t: TutorClaims) {
    return this.prisma.shop.findUniqueOrThrow({ where: { id: t.shopId } });
  }

  async me(t: TutorClaims): Promise<TutorMe> {
    const clientId = this.clientId(t);
    const shop = await this.shop(t);
    const now = this.clock.now();
    const today = localDay(now, this.env.SHOP_TIMEZONE);
    const [client, appointments] = await Promise.all([
      this.prisma.client.findUniqueOrThrow({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          pets: {
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              vaccinations: {
                orderBy: { appliedAt: 'desc' },
                select: { vaccine: true, appliedAt: true, nextDoseAt: true },
              },
            },
          },
        },
      }),
      this.prisma.appointment.findMany({
        where: { clientId, shopId: t.shopId },
        select: APPT_SELECT,
        orderBy: { startsAt: 'desc' },
        take: 40,
      }),
    ]);
    const toAppt = (a: (typeof appointments)[number]): TutorAppointment => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      service: a.service.name,
      pet: a.pet,
      professional: a.employee?.name ?? null,
      price: a.price,
      cancellable:
        ['agendado', 'confirmado'].includes(a.status) &&
        a.startsAt.getTime() - now.getTime() >= shop.cancelNoticeHours * 3_600_000,
    });
    const upcoming = appointments
      .filter((a) => a.endsAt > now && !['cancelado', 'faltou', 'concluido'].includes(a.status))
      .map(toAppt)
      .reverse();
    const past = appointments.filter((a) => !upcoming.some((u) => u.id === a.id)).map(toAppt);
    return {
      shop: await this.availability.publicShop(shop),
      client: { id: client.id, name: client.name, phone: client.phone, email: client.email },
      pets: client.pets.map((p) => {
        // Só a dose mais recente de cada vacina importa para o tutor.
        const latest = new Map<string, (typeof p.vaccinations)[number]>();
        for (const v of p.vaccinations) if (!latest.has(v.vaccine)) latest.set(v.vaccine, v);
        return {
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          vaccines: [...latest.values()].map((v) => {
            const next = v.nextDoseAt?.toISOString().slice(0, 10) ?? null;
            return {
              vaccine: v.vaccine,
              appliedAt: v.appliedAt.toISOString().slice(0, 10),
              nextDoseAt: next,
              overdue: Boolean(next && next < today),
            };
          }),
        };
      }),
      upcoming,
      past,
    };
  }

  /** Primeiro acesso de um e-mail novo: vira cliente da loja com o primeiro pet. */
  async createProfile(
    t: TutorClaims,
    input: z.infer<typeof tutorProfileSchema>,
  ): Promise<TutorSession> {
    if (t.clientId) return this.auth.issue(t);
    const client = await this.prisma.client.create({
      data: {
        shopId: t.shopId,
        name: input.name,
        phone: input.phone,
        email: t.email,
        notes: 'Cadastro feito pelo portal do tutor.',
        pets: {
          create: { name: input.pet.name, species: input.pet.species, breed: input.pet.breed },
        },
      },
    });
    return this.auth.issue({ ...t, clientId: client.id });
  }

  async addPet(t: TutorClaims, input: z.infer<typeof tutorPetSchema>): Promise<TutorMe> {
    const clientId = this.clientId(t);
    const count = await this.prisma.pet.count({ where: { clientId } });
    if (count >= 20)
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Limite de 20 pets por cadastro');
    await this.prisma.pet.create({ data: { clientId, ...input } });
    return this.me(t);
  }

  async book(t: TutorClaims, input: z.infer<typeof tutorBookingSchema>): Promise<TutorMe> {
    const clientId = this.clientId(t);
    const shop = await this.shop(t);
    if (!shop.bookingEnabled)
      throw new AppError(404, ERROR_CODES.BOOKING_DISABLED, 'Agendamento online desligado');
    const pet = await this.prisma.pet.findFirst({
      where: { id: input.petId, clientId },
      select: { id: true },
    });
    if (!pet) throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Pet inválido');
    const service = await this.availability.onlineService(shop.id, input.serviceId);
    await this.availability.book(shop, service, {
      clientId,
      petId: pet.id,
      startsAt: new Date(input.startsAt),
      notes: input.notes,
    });
    return this.me(t);
  }

  async cancel(t: TutorClaims, id: string): Promise<TutorMe> {
    const clientId = this.clientId(t);
    const shop = await this.shop(t);
    const appt = await this.prisma.appointment.findFirst({
      where: { id, clientId, shopId: t.shopId },
    });
    if (!appt) throw notFound('Agendamento');
    if (!['agendado', 'confirmado'].includes(appt.status)) {
      throw new AppError(
        409,
        ERROR_CODES.INVALID_STATUS,
        'Esse atendimento não pode mais ser cancelado',
      );
    }
    if (appt.startsAt.getTime() - this.clock.now().getTime() < shop.cancelNoticeHours * 3_600_000) {
      throw new AppError(
        409,
        ERROR_CODES.TOO_LATE,
        `Cancelamentos pelo portal só até ${shop.cancelNoticeHours} horas antes. Ligue para a loja.`,
      );
    }
    await this.prisma.appointment.updateMany({
      where: { id, status: appt.status },
      data: { status: 'cancelado' },
    });
    return this.me(t);
  }
}

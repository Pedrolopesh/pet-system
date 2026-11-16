import { Inject, Injectable } from '@nestjs/common';
import {
  BLOCKING_STATUSES,
  ERROR_CODES,
  type PublicService,
  type PublicShop,
} from '@petsystem/contracts';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { localDay, startOfLocalDay } from '../../common/time.js';
import { ENV, type Env } from '../../config/env.js';
import type { Prisma, Product, Shop } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** De quanto em quanto tempo o portal oferece horários. */
export const SLOT_STEP_MINUTES = 30;

const minutesOf = (hhmm: string): number =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const bookingDisabled = (): AppError =>
  new AppError(404, ERROR_CODES.BOOKING_DISABLED, 'Esta loja não está com agendamento online');

/**
 * Horários livres para o agendamento online e a reserva em si. As regras (funcionamento,
 * antecedência, janela de dias e conflito por profissional) ficam todas aqui, para a lista de
 * horários e a reserva nunca discordarem.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async shopBySlug(slug: string): Promise<Shop> {
    const shop = await this.prisma.shop.findUnique({ where: { slug: slug.toLowerCase() } });
    if (!shop || !shop.bookingEnabled) throw bookingDisabled();
    return shop;
  }

  async publicShop(shop: Shop): Promise<PublicShop> {
    const services = await this.prisma.product.findMany({
      where: { shopId: shop.id, category: 'servico', active: true, onlineBooking: true },
      orderBy: { name: 'asc' },
    });
    return {
      name: shop.name,
      slug: shop.slug!,
      businessTypes: shop.businessTypes,
      opensAt: shop.opensAt,
      closesAt: shop.closesAt,
      bookingNoticeHours: shop.bookingNoticeHours,
      cancelNoticeHours: shop.cancelNoticeHours,
      bookingWindowDays: shop.bookingWindowDays,
      isDemo: shop.isDemo,
      services: services.map((s): PublicService => ({
        id: s.id,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes ?? 60,
      })),
    };
  }

  async onlineService(shopId: string, serviceId: string): Promise<Product> {
    const service = await this.prisma.product.findFirst({
      where: { id: serviceId, shopId, category: 'servico', active: true, onlineBooking: true },
    });
    if (!service)
      throw new AppError(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Serviço indisponível para agendamento online',
      );
    return service;
  }

  private performers(shopId: string, service: Product) {
    if (!service.performerRole) return Promise.resolve([]);
    return this.prisma.employee.findMany({
      where: { shopId, role: service.performerRole, active: true },
      orderBy: { name: 'asc' },
      select: { id: true },
    });
  }

  /** Horários livres (HH:MM no fuso da loja) para o serviço no dia. */
  async slots(shop: Shop, service: Product, day: string): Promise<string[]> {
    const tz = this.env.SHOP_TIMEZONE;
    const now = this.clock.now();
    const today = localDay(now, tz);
    const last = localDay(new Date(now.getTime() + shop.bookingWindowDays * 86_400_000), tz);
    if (day < today || day > last) return [];

    const duration = service.durationMinutes ?? 60;
    const dayStart = startOfLocalDay(new Date(`${day}T12:00:00Z`), tz);
    const earliest = now.getTime() + shop.bookingNoticeHours * 3_600_000;
    const open = minutesOf(shop.opensAt);
    const close = minutesOf(shop.closesAt);

    const people = await this.performers(shop.id, service);
    if (service.performerRole && people.length === 0) return [];
    const busy = people.length
      ? await this.prisma.appointment.findMany({
          where: {
            employeeId: { in: people.map((p) => p.id) },
            status: { in: BLOCKING_STATUSES },
            startsAt: { lt: new Date(dayStart.getTime() + 86_400_000) },
            endsAt: { gt: dayStart },
          },
          select: { employeeId: true, startsAt: true, endsAt: true },
        })
      : [];

    const out: string[] = [];
    for (let m = open; m + duration <= close; m += SLOT_STEP_MINUTES) {
      const start = dayStart.getTime() + m * 60_000;
      const end = start + duration * 60_000;
      if (start < earliest) continue;
      const free =
        people.length === 0 ||
        people.some(
          (p) =>
            !busy.some(
              (b) =>
                b.employeeId === p.id && b.startsAt.getTime() < end && b.endsAt.getTime() > start,
            ),
        );
      if (free) out.push(hhmm(m));
    }
    return out;
  }

  /**
   * Reserva o horário para o primeiro profissional livre. A trava por profissional (a mesma da
   * agenda) faz checagem e gravação acontecerem uma de cada vez.
   */
  async book(
    shop: Shop,
    service: Product,
    data: { clientId: string; petId: string; startsAt: Date; notes: string },
  ): Promise<string> {
    const tz = this.env.SHOP_TIMEZONE;
    const day = localDay(data.startsAt, tz);
    const minute = Math.round(
      (data.startsAt.getTime() - startOfLocalDay(data.startsAt, tz).getTime()) / 60_000,
    );
    const available = await this.slots(shop, service, day);
    if (!available.includes(hhmm(minute))) {
      throw new AppError(
        409,
        ERROR_CODES.SLOT_TAKEN,
        'Esse horário não está mais disponível. Escolha outro.',
      );
    }
    const endsAt = new Date(data.startsAt.getTime() + (service.durationMinutes ?? 60) * 60_000);
    const people = await this.performers(shop.id, service);
    const base: Omit<Prisma.AppointmentUncheckedCreateInput, 'employeeId'> = {
      shopId: shop.id,
      clientId: data.clientId,
      petId: data.petId,
      serviceId: service.id,
      startsAt: data.startsAt,
      endsAt,
      price: service.price,
      notes: data.notes,
      source: 'online',
    };
    if (people.length === 0)
      return (await this.prisma.appointment.create({ data: { ...base, employeeId: null } })).id;

    for (const person of people) {
      const id = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${person.id}))`;
        const clash = await tx.appointment.findFirst({
          where: {
            employeeId: person.id,
            status: { in: BLOCKING_STATUSES },
            startsAt: { lt: endsAt },
            endsAt: { gt: data.startsAt },
          },
          select: { id: true },
        });
        if (clash) return null;
        return (await tx.appointment.create({ data: { ...base, employeeId: person.id } })).id;
      });
      if (id) return id;
    }
    throw new AppError(
      409,
      ERROR_CODES.SLOT_TAKEN,
      'Esse horário acabou de ser ocupado. Escolha outro.',
    );
  }
}

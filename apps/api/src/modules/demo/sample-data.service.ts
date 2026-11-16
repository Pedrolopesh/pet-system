import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { AppointmentStatus, BusinessType } from '@petsystem/contracts';

import { localDay } from '../../common/time.js';
import { ENV, type Env } from '../../config/env.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PAYMENT_WEIGHTS,
  SAMPLE_CLIENTS,
  SAMPLE_EMPLOYEES,
  SAMPLE_NOTES,
  SAMPLE_PRODUCTS,
} from './catalog-data.js';
import { int, pickWeighted, seeded } from './rng.js';

const DAYS = 60;
const ALL: BusinessType[] = ['petshop', 'creche', 'clinica'];

/**
 * Instante de um horário local da loja. Os dados de exemplo usam o fuso de Brasília (UTC−3, sem
 * horário de verão desde 2019).
 */
const at = (day: string, hour: number, minute = 0): Date =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`);

/**
 * Preenche uma loja com dados de exemplo coerentes com o tipo de negócio: produtos, serviços,
 * equipe, clientes com pets, 60 dias de vendas e a agenda de 14 dias atrás até 7 dias à frente.
 */
@Injectable()
export class SampleDataService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async fill(shopId: string, now: Date, types: BusinessType[] = ALL, seed = 7): Promise<void> {
    const rand = seeded(seed);
    const tz = this.env.SHOP_TIMEZONE;
    const has = (b?: BusinessType) => !b || types.includes(b);

    // Loja só de creche não vende ração nem acessórios grandes: fica com petiscos e higiene.
    const retailOk = (category: string) =>
      types.includes('petshop') ||
      types.includes('clinica') ||
      ['petisco', 'higiene'].includes(category);
    const products = SAMPLE_PRODUCTS.filter((p) =>
      p.category === 'servico' ? has(p.business) : retailOk(p.category),
    ).map((p) => ({ ...p, id: randomUUID(), sold: 0 }));
    const employees = SAMPLE_EMPLOYEES.filter((e) => has(e.business)).map((e) => ({
      ...e,
      id: randomUUID(),
    }));
    const sellers = employees.filter((e) => e.role === 'gerente' || e.role === 'atendente');
    const clients = SAMPLE_CLIENTS.map((c, i) => ({
      ...c,
      id: randomUUID(),
      phone: `489${String(91000000 + i * 7919).padStart(8, '0')}`,
      email: `${c.name
        .split(' ')[0]!
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z]/g, '')}${i}@exemplo.com`,
      createdAt: new Date(now.getTime() - int(rand, 20, 120) * 86_400_000),
      petIds: c.pets.map(() => randomUUID()),
    }));
    const servicesOf = (b: BusinessType) =>
      products.filter((p) => p.category === 'servico' && p.business === b);

    // ---------- vendas dos últimos 60 dias ----------
    const sales: Prisma.SaleCreateManyInput[] = [];
    const items: Prisma.SaleItemCreateManyInput[] = [];
    let number = 1;
    for (let d = DAYS - 1; d >= 0; d--) {
      const day = localDay(new Date(now.getTime() - d * 86_400_000), tz);
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      const busy = weekday === 6 ? 1.6 : weekday === 0 ? 0.6 : 1;
      const trend = 0.75 + (0.5 * (DAYS - d)) / DAYS;
      const count = Math.round(int(rand, 4, 10) * busy * trend);
      for (let s = 0; s < count; s++) {
        const when = at(day, int(rand, 9, 18), int(rand, 0, 59));
        if (when > now) continue;
        const saleId = randomUUID();
        const lines = new Map<number, number>();
        for (let k = int(rand, 1, 3); k > 0; k--) {
          const idx = pickWeighted(
            rand,
            products.map((p, i) => [i, p.weight] as [number, number]),
          );
          const cheap = products[idx]!.price < 1000;
          lines.set(idx, (lines.get(idx) ?? 0) + int(rand, 1, cheap ? 6 : 2));
        }
        let subtotal = 0;
        let cost = 0;
        for (const [idx, qty] of lines) {
          const p = products[idx]!;
          p.sold += qty;
          subtotal += p.price * qty;
          cost += p.cost * qty;
          items.push({
            saleId,
            productId: p.id,
            name: p.name,
            category: p.category,
            qty,
            unitPrice: p.price,
            unitCost: p.cost,
          });
        }
        const discount = rand() < 0.12 ? Math.round((subtotal * int(rand, 5, 10)) / 100) : 0;
        const service = [...lines.keys()]
          .map((i) => products[i]!)
          .find((p) => p.category === 'servico');
        const specialist = service && employees.find((e) => e.business === service.business);
        const employee = specialist ?? sellers[int(rand, 0, sellers.length - 1)]!;
        sales.push({
          id: saleId,
          shopId,
          number: number++,
          at: when,
          clientId: rand() < 0.7 ? clients[int(rand, 0, clients.length - 1)]!.id : null,
          employeeId: employee.id,
          payment: pickWeighted(rand, PAYMENT_WEIGHTS),
          subtotal,
          discount,
          total: subtotal - discount,
          cost,
        });
      }
    }

    // ---------- agenda: 14 dias atrás até 7 dias à frente ----------
    const appointments: Prisma.AppointmentCreateManyInput[] = [];
    const pick = () => {
      const c = clients[int(rand, 0, clients.length - 1)]!;
      return { client: c, petId: c.petIds[int(rand, 0, c.petIds.length - 1)]! };
    };
    const statusFor = (start: Date, end: Date): AppointmentStatus => {
      if (end <= now) return rand() < 0.08 ? 'faltou' : rand() < 0.05 ? 'cancelado' : 'concluido';
      if (start <= now) return rand() < 0.5 ? 'em_atendimento' : 'pronto';
      return rand() < 0.45 ? 'confirmado' : 'agendado';
    };
    for (let d = -14; d <= 7; d++) {
      const day = localDay(new Date(now.getTime() + d * 86_400_000), tz);
      if (new Date(`${day}T12:00:00Z`).getUTCDay() === 0) continue; // domingo fechado
      // Profissionais com agenda própria (banho/tosa e clínica): horários em sequência, sem sobrepor.
      for (const pro of employees.filter((e) => e.role === 'banho' || e.role === 'veterinario')) {
        const offer = servicesOf(pro.business!);
        let minute = 8 * 60 + int(rand, 0, 2) * 30;
        while (minute < 17 * 60) {
          const service = offer[int(rand, 0, offer.length - 1)]!;
          const start = at(day, Math.floor(minute / 60), minute % 60);
          const end = new Date(start.getTime() + service.durationMinutes! * 60_000);
          if (rand() < 0.8) {
            const { client, petId } = pick();
            appointments.push({
              shopId,
              clientId: client.id,
              petId,
              serviceId: service.id,
              employeeId: pro.id,
              startsAt: start,
              endsAt: end,
              status: statusFor(start, end),
              price: service.price,
            });
          }
          minute += service.durationMinutes! + int(rand, 0, 2) * 15;
        }
      }
      // Creche: vários pets no mesmo dia, sem bloquear profissional.
      if (types.includes('creche')) {
        const offer = servicesOf('creche');
        for (let k = int(rand, 4, 8); k > 0; k--) {
          const service = offer[int(rand, 0, offer.length - 1)]!;
          const start = at(day, int(rand, 7, 9), int(rand, 0, 3) * 15);
          const end = new Date(start.getTime() + service.durationMinutes! * 60_000);
          const { client, petId } = pick();
          appointments.push({
            shopId,
            clientId: client.id,
            petId,
            serviceId: service.id,
            employeeId: null,
            startsAt: start,
            endsAt: end,
            status: statusFor(start, end),
            price: service.price,
          });
        }
      }
    }

    // Estoque atual com alguns itens abaixo do mínimo de propósito, para o alerta aparecer.
    const lowOnPurpose = new Set(
      products
        .filter((p) => p.stock !== null)
        .slice(1, 12)
        .filter((_, i) => i % 5 === 0)
        .map((p) => p.id),
    );
    await this.prisma.$transaction([
      this.prisma.employee.createMany({
        data: employees.map((e) => ({ id: e.id, shopId, name: e.name, role: e.role })),
      }),
      this.prisma.product.createMany({
        data: products.map((p) => ({
          id: p.id,
          shopId,
          name: p.name,
          category: p.category,
          price: p.price,
          cost: p.cost,
          minStock: p.minStock,
          durationMinutes: p.durationMinutes ?? null,
          stock:
            p.stock === null
              ? null
              : lowOnPurpose.has(p.id)
                ? Math.max(0, p.minStock - 2)
                : p.stock,
        })),
      }),
      this.prisma.client.createMany({
        data: clients.map((c) => ({
          id: c.id,
          shopId,
          name: c.name,
          phone: c.phone,
          email: c.email,
          createdAt: c.createdAt,
        })),
      }),
      this.prisma.pet.createMany({
        data: clients.flatMap((c) =>
          c.pets.map(([name, species, breed], i) => ({
            id: c.petIds[i]!,
            clientId: c.id,
            name,
            species,
            breed,
          })),
        ),
      }),
      this.prisma.sale.createMany({ data: sales }),
      this.prisma.saleItem.createMany({ data: items }),
      this.prisma.appointment.createMany({ data: appointments }),
      this.prisma.note.createMany({
        data: SAMPLE_NOTES.map((text, i) => ({
          shopId,
          text,
          done: i === 2,
          priority: (['importante', 'urgente', 'normal'] as const)[i] ?? 'normal',
        })),
      }),
      this.prisma.stockMovement.createMany({
        data: products
          .filter((p) => p.stock !== null)
          .map((p) => ({
            shopId,
            productId: p.id,
            delta: (p.stock ?? 0) + p.sold,
            reason: 'entrada' as const,
            createdAt: new Date(now.getTime() - DAYS * 86_400_000),
          })),
      }),
      this.prisma.shop.update({ where: { id: shopId }, data: { nextSaleNumber: number } }),
    ]);
  }
}

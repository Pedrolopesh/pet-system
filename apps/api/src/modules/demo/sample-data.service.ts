import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

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

/** Preenche uma loja com produtos, equipe, clientes e 60 dias de vendas até `now`. */
@Injectable()
export class SampleDataService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async fill(shopId: string, now: Date, seed = 7): Promise<void> {
    const rand = seeded(seed);
    const tz = this.env.SHOP_TIMEZONE;

    const products = SAMPLE_PRODUCTS.map((p) => ({ ...p, id: randomUUID(), sold: 0 }));
    const employees = SAMPLE_EMPLOYEES.map((e) => ({ ...e, id: randomUUID() }));
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
    }));

    const sales: Prisma.SaleCreateManyInput[] = [];
    const items: Prisma.SaleItemCreateManyInput[] = [];
    let number = 1;
    for (let d = DAYS - 1; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 86_400_000);
      const weekday = new Date(`${localDay(day, tz)}T12:00:00Z`).getUTCDay();
      const busy = weekday === 6 ? 1.6 : weekday === 0 ? 0.6 : 1;
      // Leve tendência de alta no período, para o gráfico ter história.
      const trend = 0.75 + (0.5 * (DAYS - d)) / DAYS;
      const count = Math.round(int(rand, 4, 10) * busy * trend);
      for (let s = 0; s < count; s++) {
        // Horário comercial (9h a 19h no fuso da loja); hoje, só até agora.
        const hour = int(rand, 9, 18);
        const at = new Date(
          `${localDay(day, tz)}T${String(hour + 3).padStart(2, '0')}:${String(int(rand, 0, 59)).padStart(2, '0')}:00Z`,
        );
        if (at > now) continue;
        const saleId = randomUUID();
        const lines = new Map<number, number>();
        for (let k = int(rand, 1, 3); k > 0; k--) {
          const idx = pickWeighted(
            rand,
            products.map((p, i) => [i, p.weight] as [number, number]),
          );
          lines.set(
            idx,
            (lines.get(idx) ?? 0) +
              int(
                rand,
                1,
                products[idx]!.category === 'racao' && products[idx]!.price < 1000 ? 6 : 2,
              ),
          );
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
        const service = [...lines.keys()].some((i) => products[i]!.category === 'servico');
        const employee = service ? employees[3]! : employees[int(rand, 0, 2)]!;
        sales.push({
          id: saleId,
          shopId,
          number: number++,
          at,
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

    // Estoque atual = reposição suficiente para as vendas + o estoque inicial; alguns ficam abaixo
    // do mínimo de propósito, para o alerta de estoque baixo aparecer.
    const lowOnPurpose = new Set([1, 10, 14]);
    await this.prisma.$transaction([
      this.prisma.employee.createMany({
        data: employees.map((e) => ({ id: e.id, shopId, name: e.name, role: e.role })),
      }),
      this.prisma.product.createMany({
        data: products.map((p, i) => ({
          id: p.id,
          shopId,
          name: p.name,
          category: p.category,
          price: p.price,
          cost: p.cost,
          minStock: p.minStock,
          stock:
            p.stock === null ? null : lowOnPurpose.has(i) ? Math.max(0, p.minStock - 2) : p.stock,
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
          c.pets.map(([name, species, breed]) => ({ clientId: c.id, name, species, breed })),
        ),
      }),
      this.prisma.sale.createMany({ data: sales }),
      this.prisma.saleItem.createMany({ data: items }),
      this.prisma.note.createMany({
        data: SAMPLE_NOTES.map((text, i) => ({ shopId, text, done: i === 2 })),
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

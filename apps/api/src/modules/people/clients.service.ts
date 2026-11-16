import { Inject, Injectable } from '@nestjs/common';
import type { Client, ClientDetail, clientInputSchema } from '@petsystem/contracts';
import type { z } from 'zod';

import { notFound } from '../../common/not-found.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  notes: true,
  createdAt: true,
  pets: { select: { id: true, name: true, species: true, breed: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.ClientSelect;

type Row = Prisma.ClientGetPayload<{ select: typeof SELECT }>;
const toClient = (c: Row): Client => ({ ...c, createdAt: c.createdAt.toISOString() });

@Injectable()
export class ClientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(shopId: string, q?: string): Promise<Client[]> {
    const term = q?.trim();
    const rows = await this.prisma.client.findMany({
      where: {
        shopId,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term.replace(/\D/g, '') || term } },
                { pets: { some: { name: { contains: term, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      select: SELECT,
      orderBy: { name: 'asc' },
      take: 200,
    });
    return rows.map(toClient);
  }

  async get(shopId: string, id: string): Promise<ClientDetail> {
    const row = await this.prisma.client.findFirst({ where: { id, shopId }, select: SELECT });
    if (!row) throw notFound('Cliente');
    const agg = await this.prisma.sale.aggregate({
      where: { shopId, clientId: id },
      _count: true,
      _sum: { total: true },
      _max: { at: true },
    });
    return {
      ...toClient(row),
      stats: {
        purchases: agg._count,
        spent: agg._sum.total ?? 0,
        lastPurchaseAt: agg._max.at?.toISOString() ?? null,
      },
    };
  }

  async create(shopId: string, input: z.infer<typeof clientInputSchema>): Promise<Client> {
    const { pets, ...data } = input;
    const row = await this.prisma.client.create({
      data: {
        ...data,
        shopId,
        pets: { create: pets.map(({ name, species, breed }) => ({ name, species, breed })) },
      },
      select: SELECT,
    });
    return toClient(row);
  }

  /** Atualiza o cliente e sincroniza os pets: mantém os com id, cria os novos e remove os que saíram. */
  async update(
    shopId: string,
    id: string,
    input: z.infer<typeof clientInputSchema>,
  ): Promise<Client> {
    const { pets, ...data } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const exists = await tx.client.findFirst({ where: { id, shopId }, select: { id: true } });
      if (!exists) throw notFound('Cliente');
      const keep = pets.filter((p) => p.id).map((p) => p.id!);
      await tx.pet.deleteMany({ where: { clientId: id, id: { notIn: keep } } });
      for (const pet of pets) {
        if (pet.id) {
          // updateMany com clientId: um id de pet de outro cliente não é alterado.
          await tx.pet.updateMany({
            where: { id: pet.id, clientId: id },
            data: { name: pet.name, species: pet.species, breed: pet.breed },
          });
        } else {
          await tx.pet.create({
            data: { clientId: id, name: pet.name, species: pet.species, breed: pet.breed },
          });
        }
      }
      return tx.client.update({ where: { id }, data, select: SELECT });
    });
    return toClient(row);
  }

  async remove(shopId: string, id: string): Promise<void> {
    const { count } = await this.prisma.client.deleteMany({ where: { id, shopId } });
    if (count !== 1) throw notFound('Cliente');
  }
}

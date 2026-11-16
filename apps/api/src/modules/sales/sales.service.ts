import { Inject, Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type Page,
  type Sale,
  type saleInputSchema,
  type saleQuerySchema,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { notFound } from '../../common/not-found.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export const SALE_SELECT = {
  id: true,
  number: true,
  at: true,
  payment: true,
  discount: true,
  total: true,
  client: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
  items: { select: { productId: true, name: true, qty: true, unitPrice: true } },
} satisfies Prisma.SaleSelect;

type Row = Prisma.SaleGetPayload<{ select: typeof SALE_SELECT }>;
export const toSale = (s: Row): Sale => ({ ...s, at: s.at.toISOString() });

@Injectable()
export class SalesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /**
   * Fecha a venda numa transação: confere produtos, baixa o estoque com UPDATE condicional (nunca
   * fica negativo, mesmo com duas vendas simultâneas), numera e grava. Qualquer falha desfaz tudo.
   */
  async create(shopId: string, input: z.infer<typeof saleInputSchema>): Promise<Sale> {
    const row = await this.prisma.$transaction(async (tx) => {
      // Consultas em sequência: dentro de uma transação a conexão é uma só.
      const employee = await tx.employee.findFirst({
        where: { id: input.employeeId, shopId, active: true },
        select: { id: true },
      });
      const client = input.clientId
        ? await tx.client.findFirst({ where: { id: input.clientId, shopId }, select: { id: true } })
        : null;
      if (!employee) throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Funcionário inválido');
      if (input.clientId && !client)
        throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Cliente inválido');

      const ids = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: ids }, shopId, active: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      for (const item of input.items) {
        if (!byId.has(item.productId)) {
          throw new AppError(
            409,
            ERROR_CODES.PRODUCT_UNAVAILABLE,
            'Um produto do carrinho não está disponível',
          );
        }
      }

      let subtotal = 0;
      let cost = 0;
      for (const item of input.items) {
        const p = byId.get(item.productId)!;
        subtotal += p.price * item.qty;
        cost += p.cost * item.qty;
        if (p.stock === null) continue;
        const changed = await tx.product.updateMany({
          where: { id: p.id, shopId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (changed.count !== 1) {
          throw new AppError(409, ERROR_CODES.OUT_OF_STOCK, `Estoque insuficiente de ${p.name}`, {
            productId: p.id,
          });
        }
      }
      if (input.discount > subtotal) {
        throw new AppError(400, ERROR_CODES.INVALID_DISCOUNT, 'O desconto é maior que o subtotal');
      }

      const { nextSaleNumber } = await tx.shop.update({
        where: { id: shopId },
        data: { nextSaleNumber: { increment: 1 } },
        select: { nextSaleNumber: true },
      });
      const sale = await tx.sale.create({
        data: {
          shopId,
          number: nextSaleNumber - 1,
          at: this.clock.now(),
          clientId: input.clientId,
          employeeId: input.employeeId,
          payment: input.payment,
          subtotal,
          discount: input.discount,
          total: subtotal - input.discount,
          cost,
          items: {
            create: input.items.map((item) => {
              const p = byId.get(item.productId)!;
              return {
                productId: p.id,
                name: p.name,
                category: p.category,
                qty: item.qty,
                unitPrice: p.price,
                unitCost: p.cost,
              };
            }),
          },
        },
        select: SALE_SELECT,
      });
      await tx.stockMovement.createMany({
        data: input.items
          .filter((i) => byId.get(i.productId)!.stock !== null)
          .map((i) => ({
            shopId,
            productId: i.productId,
            delta: -i.qty,
            reason: 'venda' as const,
            saleId: sale.id,
          })),
      });
      return sale;
    });
    return toSale(row);
  }

  async list(shopId: string, query: z.infer<typeof saleQuerySchema>): Promise<Page<Sale>> {
    const since = new Date(this.clock.now().getTime() - query.days * 86_400_000);
    const where: Prisma.SaleWhereInput = {
      shopId,
      at: { gte: since },
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        select: SALE_SELECT,
        orderBy: { at: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { items: rows.map(toSale), total, page: query.page, pageSize: query.pageSize };
  }

  async get(shopId: string, id: string): Promise<Sale> {
    const row = await this.prisma.sale.findFirst({ where: { id, shopId }, select: SALE_SELECT });
    if (!row) throw notFound('Venda');
    return toSale(row);
  }
}

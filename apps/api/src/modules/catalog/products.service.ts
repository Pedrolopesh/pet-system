import { Inject, Injectable } from '@nestjs/common';
import type {
  Product,
  productInputSchema,
  productQuerySchema,
  ProductUpdate,
  StockAdjust,
} from '@petsystem/contracts';
import { ERROR_CODES } from '@petsystem/contracts';
import type { z } from 'zod';

import { AppError } from '../../common/app-error.js';
import { defined } from '../../common/defined.js';
import { notFound } from '../../common/not-found.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const SELECT = {
  id: true,
  name: true,
  category: true,
  price: true,
  cost: true,
  stock: true,
  minStock: true,
  active: true,
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(shopId: string, query: z.infer<typeof productQuerySchema>): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: {
        shopId,
        ...(query.includeInactive ? {} : { active: true }),
        ...(query.category ? { category: query.category } : {}),
        ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      },
      select: SELECT,
      orderBy: { name: 'asc' },
    });
    // "Estoque baixo" compara duas colunas: filtra aqui (a lista por loja é pequena).
    return query.lowStock
      ? products.filter((p) => p.stock !== null && p.stock <= p.minStock)
      : products;
  }

  async create(shopId: string, input: z.infer<typeof productInputSchema>): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...input, shopId }, select: SELECT });
      if (input.stock) {
        await tx.stockMovement.create({
          data: { shopId, productId: product.id, delta: input.stock, reason: 'entrada' },
        });
      }
      return product;
    });
  }

  async update(shopId: string, id: string, input: ProductUpdate): Promise<Product> {
    const current = await this.prisma.product.findFirst({
      where: { id, shopId },
      select: { category: true, stock: true },
    });
    if (!current) throw notFound('Produto');
    // Produto vira serviço só se não tiver estoque, e vice-versa: a categoria muda o controle de estoque.
    const toService = input.category === 'servico' && current.category !== 'servico';
    const fromService =
      input.category && input.category !== 'servico' && current.category === 'servico';
    if (toService && current.stock) {
      throw new AppError(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Zere o estoque antes de transformar em serviço',
      );
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        ...defined(input),
        ...(toService ? { stock: null } : {}),
        ...(fromService ? { stock: 0 } : {}),
      },
      select: SELECT,
    });
  }

  /** Entrada, perda ou correção. Nunca deixa o estoque negativo (UPDATE condicional). */
  async adjustStock(shopId: string, id: string, input: StockAdjust): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.product.updateMany({
        where: { id, shopId, stock: { not: null, gte: Math.max(0, -input.delta) } },
        data: { stock: { increment: input.delta } },
      });
      if (changed.count !== 1) {
        const exists = await tx.product.findFirst({
          where: { id, shopId },
          select: { stock: true },
        });
        if (!exists) throw notFound('Produto');
        if (exists.stock === null) {
          throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Serviços não têm estoque');
        }
        throw new AppError(409, ERROR_CODES.OUT_OF_STOCK, 'O ajuste deixaria o estoque negativo');
      }
      await tx.stockMovement.create({
        data: { shopId, productId: id, delta: input.delta, reason: input.reason },
      });
      return tx.product.findUniqueOrThrow({ where: { id }, select: SELECT });
    });
  }
}

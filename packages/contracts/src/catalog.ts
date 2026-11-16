import { z } from 'zod';

import { centsSchema, requiredText } from './common.js';

export const CATEGORIES = [
  'racao',
  'petisco',
  'higiene',
  'acessorio',
  'farmacia',
  'servico',
] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const productInputSchema = z
  .object({
    name: requiredText(80),
    category: categorySchema,
    price: centsSchema,
    cost: centsSchema,
    /** Serviços (banho, tosa) não controlam estoque: null. */
    stock: z.number().int().min(0).max(1_000_000).nullable(),
    minStock: z.number().int().min(0).max(1_000_000).default(0),
  })
  .refine((p) => p.category !== 'servico' || p.stock === null, {
    path: ['stock'],
    message: 'serviços não têm estoque',
  });
export type ProductInput = z.input<typeof productInputSchema>;

export const productUpdateSchema = z.object({
  name: requiredText(80).optional(),
  category: categorySchema.optional(),
  price: centsSchema.optional(),
  cost: centsSchema.optional(),
  minStock: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

/** Ajuste de estoque: entrada (positivo) ou perda/correção (negativo). */
export const stockAdjustSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((n) => n !== 0, 'precisa ser diferente de zero'),
  reason: z.enum(['entrada', 'perda', 'correcao']),
});
export type StockAdjust = z.infer<typeof stockAdjustSchema>;

export const productQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: categorySchema.optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  cost: number;
  stock: number | null;
  minStock: number;
  active: boolean;
};

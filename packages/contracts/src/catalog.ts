import { z } from 'zod';

import { centsSchema, requiredText } from './common.js';
import type { ROLES } from './people.js';

/** Quem pode executar um serviço agendado online. */
export const PERFORMER_ROLES = ['banho', 'veterinario', 'cuidador'] as const;

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
    /** Duração padrão na agenda (só serviços). */
    durationMinutes: z
      .number()
      .int()
      .min(10)
      .max(12 * 60)
      .nullable()
      .default(null),
    /** Aparece no agendamento online e quem executa (só serviços). */
    onlineBooking: z.boolean().default(false),
    performerRole: z.enum(PERFORMER_ROLES).nullable().default(null),
  })
  .refine((p) => p.category !== 'servico' || p.stock === null, {
    path: ['stock'],
    message: 'serviços não têm estoque',
  })
  .refine((p) => p.category === 'servico' || p.durationMinutes === null, {
    path: ['durationMinutes'],
    message: 'só serviços têm duração',
  });
export type ProductInput = z.input<typeof productInputSchema>;

export const productUpdateSchema = z.object({
  name: requiredText(80).optional(),
  category: categorySchema.optional(),
  price: centsSchema.optional(),
  cost: centsSchema.optional(),
  minStock: z.number().int().min(0).max(1_000_000).optional(),
  durationMinutes: z
    .number()
    .int()
    .min(10)
    .max(12 * 60)
    .nullable()
    .optional(),
  onlineBooking: z.boolean().optional(),
  performerRole: z.enum(PERFORMER_ROLES).nullable().optional(),
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
  durationMinutes: number | null;
  onlineBooking: boolean;
  /** Validado na entrada como um dos PERFORMER_ROLES. */
  performerRole: (typeof ROLES)[number] | null;
  active: boolean;
};

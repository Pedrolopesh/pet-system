import { z } from 'zod';

export const idSchema = z.uuid();

/** Dinheiro sempre em centavos (inteiro), para não errar arredondamento. */
export const centsSchema = z.number().int().min(0).max(100_000_000);

/** Texto curto obrigatório: tira espaços das pontas e não aceita vazio. */
export const requiredText = (max: number) => z.string().trim().min(1).max(max);
/** Texto curto opcional: vazio vira "". */
export const optionalText = (max: number) => z.string().trim().max(max).default('');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

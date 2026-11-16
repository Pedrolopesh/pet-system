import { z } from 'zod';

import { optionalText, requiredText } from './common.js';

export const SPECIES = ['cao', 'gato', 'outro'] as const;
export const ROLES = ['gerente', 'atendente', 'banho'] as const;

/** Telefone brasileiro: só dígitos, 10 ou 11 (com DDD). Vazio é permitido. */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || /^\d{10,11}$/.test(v), 'telefone com DDD, 10 ou 11 dígitos')
  .default('');

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || z.email().safeParse(v).success, 'e-mail inválido')
  .default('');

export const petInputSchema = z.object({
  id: z.uuid().optional(),
  name: requiredText(40),
  species: z.enum(SPECIES),
  breed: optionalText(40),
});

export const clientInputSchema = z.object({
  name: requiredText(80),
  phone,
  email: optionalEmail,
  notes: optionalText(500),
  pets: z.array(petInputSchema).max(20).default([]),
});
export type ClientInput = z.input<typeof clientInputSchema>;

export const employeeInputSchema = z.object({
  name: requiredText(80),
  role: z.enum(ROLES),
  active: z.boolean().default(true),
});
export type EmployeeInput = z.input<typeof employeeInputSchema>;

export type Pet = { id: string; name: string; species: (typeof SPECIES)[number]; breed: string };

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  pets: Pet[];
  createdAt: string;
};

export type ClientDetail = Client & {
  stats: { purchases: number; spent: number; lastPurchaseAt: string | null };
};

export type Employee = {
  id: string;
  name: string;
  role: (typeof ROLES)[number];
  active: boolean;
  salesThisMonth: number;
  revenueThisMonth: number;
};

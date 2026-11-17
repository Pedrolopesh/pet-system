import { z } from 'zod';

import { centsSchema } from './common.js';

export const PAYMENTS = ['pix', 'credito', 'debito', 'dinheiro'] as const;
export const paymentSchema = z.enum(PAYMENTS);
export type Payment = z.infer<typeof paymentSchema>;

export const saleInputSchema = z.object({
  items: z
    .array(z.object({ productId: z.uuid(), qty: z.number().int().min(1).max(999) }))
    .min(1, 'o carrinho está vazio')
    .max(50)
    .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
      message: 'produto repetido no carrinho',
    }),
  clientId: z.uuid().nullable().default(null),
  employeeId: z.uuid(),
  payment: paymentSchema,
  discount: centsSchema.default(0),
  /** Atendimentos da agenda cobrados nesta venda (ficam concluídos e ligados a ela). */
  appointmentIds: z.array(z.uuid()).max(10).default([]),
});
export type SaleInput = z.input<typeof saleInputSchema>;

export const saleQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(30),
  clientId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SaleItem = { productId: string; name: string; qty: number; unitPrice: number };

export type Sale = {
  id: string;
  number: number;
  at: string;
  client: { id: string; name: string } | null;
  employee: { id: string; name: string };
  items: SaleItem[];
  payment: Payment;
  discount: number;
  total: number;
};

export const NOTE_PRIORITIES = ['urgente', 'importante', 'normal'] as const;
export const noteInputSchema = z.object({
  text: z.string().trim().min(1).max(200),
  done: z.boolean().default(false),
  priority: z.enum(NOTE_PRIORITIES).default('normal'),
});
export const noteUpdateSchema = noteInputSchema.partial();
export type Note = {
  id: string;
  text: string;
  done: boolean;
  priority: (typeof NOTE_PRIORITIES)[number];
  createdAt: string;
};

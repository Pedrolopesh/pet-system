import { z } from 'zod';

import type { AppointmentStatus } from './agenda.js';
import { BUSINESS_TYPES } from './saas.js';

/** Endereço público da loja: letras minúsculas, números e hífen. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/,
    'use de 3 a 40 letras minúsculas, números e hífen',
  );

/** Gera um endereço a partir do nome ("Pet Shop Patas & Cia" → "pet-shop-patas-cia"). */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34)
    .replace(/-+$/g, '');
  return s.length >= 3 ? s : `loja-${s || 'pet'}`;
}

export const bookingSettingsSchema = z.object({
  slug: slugSchema.optional(),
  bookingEnabled: z.boolean().optional(),
  bookingNoticeHours: z.number().int().min(0).max(72).optional(),
  cancelNoticeHours: z.number().int().min(0).max(72).optional(),
  bookingWindowDays: z.number().int().min(1).max(90).optional(),
});
export type BookingSettings = z.infer<typeof bookingSettingsSchema>;

export type PublicService = { id: string; name: string; price: number; durationMinutes: number };

export type PublicShop = {
  name: string;
  slug: string;
  businessTypes: (typeof BUSINESS_TYPES)[number][];
  opensAt: string;
  closesAt: string;
  bookingNoticeHours: number;
  cancelNoticeHours: number;
  bookingWindowDays: number;
  isDemo: boolean;
  services: PublicService[];
};

export const slotsQuerySchema = z.object({
  serviceId: z.uuid(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Slots = { day: string; slots: string[] };

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const tutorCodeRequestSchema = z.object({ email });
export const tutorCodeVerifySchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, 'código de 6 dígitos'),
});

const species = z.enum(['cao', 'gato', 'outro']);
export const tutorPetSchema = z.object({
  name: z.string().trim().min(1).max(40),
  species,
  breed: z.string().trim().max(40).default(''),
});
export const tutorProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => /^\d{10,11}$/.test(v), 'telefone com DDD, 10 ou 11 dígitos'),
  pet: tutorPetSchema,
});
export type TutorProfileInput = z.input<typeof tutorProfileSchema>;

export const tutorBookingSchema = z.object({
  petId: z.uuid(),
  serviceId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(300).default(''),
});
export type TutorBookingInput = z.input<typeof tutorBookingSchema>;

export type TutorSession = {
  token: string;
  expiresIn: number;
  /** false quando o e-mail ainda não é cliente da loja: falta completar o cadastro. */
  registered: boolean;
};

export type TutorAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  service: string;
  pet: { id: string; name: string };
  professional: string | null;
  price: number;
  /** Ainda dá para cancelar pelo portal (antes do prazo da loja). */
  cancellable: boolean;
};

export type TutorMe = {
  shop: PublicShop;
  client: { id: string; name: string; phone: string; email: string };
  pets: {
    id: string;
    name: string;
    species: 'cao' | 'gato' | 'outro';
    breed: string;
    vaccines: { vaccine: string; appliedAt: string; nextDoseAt: string | null; overdue: boolean }[];
  }[];
  upcoming: TutorAppointment[];
  past: TutorAppointment[];
};

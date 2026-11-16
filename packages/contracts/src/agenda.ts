import { z } from 'zod';

export const APPOINTMENT_STATUSES = [
  'agendado',
  'confirmado',
  'em_atendimento',
  'pronto',
  'concluido',
  'cancelado',
  'faltou',
] as const;
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/** Status que ainda ocupam o horário do profissional. */
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  'agendado',
  'confirmado',
  'em_atendimento',
  'pronto',
];
/** Status finais: não mudam mais. */
export const FINAL_STATUSES: AppointmentStatus[] = ['concluido', 'cancelado', 'faltou'];

/** Próximos passos permitidos a partir de cada status (o fluxo do atendimento). */
export const NEXT_STATUS: Record<AppointmentStatus, AppointmentStatus[]> = {
  agendado: ['confirmado', 'em_atendimento', 'cancelado', 'faltou'],
  confirmado: ['em_atendimento', 'cancelado', 'faltou'],
  em_atendimento: ['pronto', 'concluido'],
  pronto: ['concluido'],
  concluido: [],
  cancelado: [],
  faltou: [],
};

export const canMove = (from: AppointmentStatus, to: AppointmentStatus): boolean =>
  NEXT_STATUS[from].includes(to);

export const appointmentInputSchema = z.object({
  clientId: z.uuid(),
  petId: z.uuid(),
  serviceId: z.uuid(),
  employeeId: z.uuid().nullable().default(null),
  startsAt: z.iso.datetime({ offset: true }),
  /** Sem duração, usa a padrão do serviço. */
  durationMinutes: z
    .number()
    .int()
    .min(10)
    .max(12 * 60)
    .optional(),
  notes: z.string().trim().max(500).default(''),
});
export type AppointmentInput = z.input<typeof appointmentInputSchema>;

export const appointmentUpdateSchema = z.object({
  employeeId: z.uuid().nullable().optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  durationMinutes: z
    .number()
    .int()
    .min(10)
    .max(12 * 60)
    .optional(),
  notes: z.string().trim().max(500).optional(),
});
export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>;

export const appointmentStatusInputSchema = z.object({ status: appointmentStatusSchema });

export const agendaQuerySchema = z.object({
  /** Dia local (YYYY-MM-DD). Com `days`, a partir dele. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(1).max(31).default(1),
  employeeId: z.uuid().optional(),
});

export type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  price: number;
  notes: string;
  client: { id: string; name: string; phone: string };
  pet: { id: string; name: string; species: 'cao' | 'gato' | 'outro'; breed: string };
  service: { id: string; name: string };
  employee: { id: string; name: string } | null;
  saleId: string | null;
};

import { z } from 'zod';

export const PET_SEX = ['macho', 'femea'] as const;
export const RECORD_KINDS = [
  'consulta',
  'retorno',
  'vacinacao',
  'emergencia',
  'procedimento',
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

/** Horas em que um registro do prontuário ainda pode ser corrigido. Depois disso fica travado. */
export const RECORD_EDIT_HOURS = 24;

/**
 * Vacinas comuns com o intervalo sugerido até o reforço (dias). É só uma sugestão para preencher a
 * data: a clínica ajusta conforme o protocolo dela e a idade do animal.
 */
export const VACCINES: { name: string; species: 'cao' | 'gato' | 'ambos'; boosterDays: number }[] =
  [
    { name: 'V10 (polivalente canina)', species: 'cao', boosterDays: 365 },
    { name: 'V8 (polivalente canina)', species: 'cao', boosterDays: 365 },
    { name: 'Antirrábica', species: 'ambos', boosterDays: 365 },
    { name: 'Gripe canina (tosse dos canis)', species: 'cao', boosterDays: 365 },
    { name: 'Giárdia', species: 'cao', boosterDays: 365 },
    { name: 'Leishmaniose', species: 'cao', boosterDays: 365 },
    { name: 'V4 (quádrupla felina)', species: 'gato', boosterDays: 365 },
    { name: 'V5 (quíntupla felina)', species: 'gato', boosterDays: 365 },
  ];

const text = (max: number) => z.string().trim().max(max).default('');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data AAAA-MM-DD');

export const petHealthSchema = z.object({
  birthDate: day.nullable().optional(),
  sex: z.enum(PET_SEX).nullable().optional(),
  neutered: z.boolean().nullable().optional(),
  allergies: z.string().trim().max(300).optional(),
});
export type PetHealth = z.infer<typeof petHealthSchema>;

export const prescriptionItemSchema = z.object({
  medication: z.string().trim().min(1).max(120),
  dosage: text(120),
  frequency: text(120),
  duration: text(120),
  instructions: text(500),
});

export const recordInputSchema = z.object({
  kind: z.enum(RECORD_KINDS).default('consulta'),
  vetId: z.uuid().nullable().default(null),
  appointmentId: z.uuid().nullable().default(null),
  /** Peso em kg (até 3 casas) e temperatura em °C (1 casa); a API guarda em inteiros. */
  weightKg: z.number().min(0.01).max(150).nullable().default(null),
  temperatureC: z.number().min(30).max(45).nullable().default(null),
  complaint: text(2000),
  exam: text(4000),
  diagnosis: text(2000),
  treatment: text(4000),
  prescription: z.array(prescriptionItemSchema).max(20).default([]),
});
export type RecordInput = z.input<typeof recordInputSchema>;

export const vaccinationInputSchema = z
  .object({
    vaccine: z.string().trim().min(1).max(80),
    appliedAt: day,
    nextDoseAt: day.nullable().default(null),
    batch: text(40),
    vetId: z.uuid().nullable().default(null),
    recordId: z.uuid().nullable().default(null),
  })
  .refine((v) => !v.nextDoseAt || v.nextDoseAt > v.appliedAt, {
    path: ['nextDoseAt'],
    message: 'o reforço precisa ser depois da aplicação',
  });
export type VaccinationInput = z.input<typeof vaccinationInputSchema>;

export const dueQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(120).default(30),
});

export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;

export type MedicalRecord = {
  id: string;
  kind: RecordKind;
  at: string;
  weightKg: number | null;
  temperatureC: number | null;
  complaint: string;
  exam: string;
  diagnosis: string;
  treatment: string;
  prescription: PrescriptionItem[];
  vet: { id: string; name: string } | null;
  author: { id: string; name: string } | null;
  appointmentId: string | null;
  /** Ainda dentro da janela de correção. */
  editable: boolean;
};

export type Vaccination = {
  id: string;
  vaccine: string;
  appliedAt: string;
  nextDoseAt: string | null;
  batch: string;
  vet: { id: string; name: string } | null;
  /** Ainda pode ser apagada (lançamento errado, dentro da janela de correção). */
  removable: boolean;
};

export type ClinicalPet = {
  id: string;
  name: string;
  species: 'cao' | 'gato' | 'outro';
  breed: string;
  birthDate: string | null;
  sex: (typeof PET_SEX)[number] | null;
  neutered: boolean | null;
  allergies: string;
  client: { id: string; name: string; phone: string; email: string };
};

export type ClinicalFile = {
  pet: ClinicalPet;
  records: MedicalRecord[];
  vaccinations: Vaccination[];
  weights: { at: string; kg: number }[];
};

export type DueVaccine = {
  id: string;
  vaccine: string;
  nextDoseAt: string;
  overdue: boolean;
  pet: { id: string; name: string; species: 'cao' | 'gato' | 'outro' };
  client: { id: string; name: string; phone: string };
};

/** Receita para impressão: o registro com os dados da loja, do pet e do tutor. */
export type PrescriptionDoc = {
  shop: { name: string };
  record: MedicalRecord;
  pet: ClinicalPet;
};

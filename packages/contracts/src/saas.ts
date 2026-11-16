import { z } from 'zod';

export const BUSINESS_TYPES = ['petshop', 'creche', 'clinica'] as const;
export const businessTypeSchema = z.enum(BUSINESS_TYPES);
export type BusinessType = z.infer<typeof businessTypeSchema>;

export const PLANS = ['teste', 'basico', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

export const USER_ROLES = ['dono', 'gerente', 'atendente'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Dias de teste grátis de uma loja nova. */
export const TRIAL_DAYS = 14;

/**
 * Limites de cada plano. `null` = ilimitado. O teste tem tudo do Pro.
 * A cobrança ainda não está ligada: trocar de plano é só uma escolha na tela.
 */
export const PLAN_LIMITS: Record<
  Plan,
  { users: number | null; professionals: number | null; reports: boolean }
> = {
  teste: { users: null, professionals: null, reports: true },
  basico: { users: 2, professionals: 3, reports: false },
  pro: { users: null, professionals: null, reports: true },
};

export const PLAN_INFO: Record<
  Exclude<Plan, 'teste'>,
  { name: string; price: number; highlights: string[] }
> = {
  basico: {
    name: 'Básico',
    price: 7900,
    highlights: [
      'Caixa, estoque e clientes com pets',
      'Agenda com até 3 profissionais',
      'Até 2 usuários',
    ],
  },
  pro: {
    name: 'Pro',
    price: 14900,
    highlights: [
      'Tudo do Básico',
      'Profissionais e usuários ilimitados',
      'Relatórios completos e exportação',
    ],
  },
};

/** O que cada papel pode fazer. O dono pode tudo. */
export const PERMISSIONS = {
  /** Convidar e remover pessoas, trocar plano e dados da loja. */
  manageAccount: ['dono'],
  /** Cadastrar produtos, preços, equipe e ver relatórios. */
  manageShop: ['dono', 'gerente'],
} as const satisfies Record<string, readonly UserRole[]>;

export const can = (role: UserRole, action: keyof typeof PERMISSIONS): boolean =>
  (PERMISSIONS[action] as readonly UserRole[]).includes(role);

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'horário HH:MM');

export const shopSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    businessTypes: z.array(businessTypeSchema).min(1).max(3),
    opensAt: time,
    closesAt: time,
  })
  .partial()
  .refine((s) => !s.opensAt || !s.closesAt || s.opensAt < s.closesAt, {
    path: ['closesAt'],
    message: 'o fechamento precisa ser depois da abertura',
  });
export type ShopSettings = z.infer<typeof shopSettingsSchema>;

export const planChangeSchema = z.object({ plan: z.enum(['basico', 'pro']) });

export const inviteCreateSchema = z.object({ role: z.enum(['gerente', 'atendente']) });
export const inviteAcceptSchema = z.object({
  token: z.string().min(20).max(100),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8, 'mínimo de 8 caracteres').max(128),
});
export type InviteAccept = z.infer<typeof inviteAcceptSchema>;

export type Shop = {
  id: string;
  name: string;
  isDemo: boolean;
  businessTypes: BusinessType[];
  plan: Plan;
  trialEndsAt: string | null;
  opensAt: string;
  closesAt: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLoginAt: string | null;
};
export type InviteLink = { id: string; role: UserRole; token: string; expiresAt: string };
export type PendingInvite = { id: string; role: UserRole; expiresAt: string };
export type Account = {
  shop: Shop;
  members: Member[];
  invites: PendingInvite[];
  usage: { users: number; professionals: number };
};

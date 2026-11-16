import { z } from 'zod';

/** Códigos de erro devolvidos pela API. O app escolhe a mensagem pelo código. */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  /** E-mail ou senha errados (mesma resposta para os dois, para não revelar contas). */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  /** Estoque insuficiente para fechar a venda. */
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  /** Produto desativado ou de outra loja no carrinho. */
  PRODUCT_UNAVAILABLE: 'PRODUCT_UNAVAILABLE',
  /** Desconto maior que o subtotal. */
  INVALID_DISCOUNT: 'INVALID_DISCOUNT',
  /** A conta de demonstração não pode trocar e-mail nem senha. */
  DEMO_READ_ONLY: 'DEMO_READ_ONLY',
  /** O profissional já tem atendimento nesse horário. */
  SLOT_TAKEN: 'SLOT_TAKEN',
  /** Mudança de status fora do fluxo (ex.: concluído → agendado). */
  INVALID_STATUS: 'INVALID_STATUS',
  /** O plano atual não permite (limite de usuários, profissionais ou recurso do Pro). */
  PLAN_LIMIT: 'PLAN_LIMIT',
  /** Convite inválido, expirado ou já usado. */
  INVALID_INVITE: 'INVALID_INVITE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Formato padrão de erro: { code, message, requestId }. Nunca inclui dados sensíveis. */
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  requestId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

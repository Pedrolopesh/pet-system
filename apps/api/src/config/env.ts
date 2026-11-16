import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);
const bool = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(fallback)
    .transform((value) => value === 'true');

/** Variáveis de ambiente. A API não sobe se alguma faltar ou for inválida. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3340),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'precisa ter pelo menos 32 caracteres'),
  JWT_ISSUER: z.string().min(1).default('petsystem-api'),
  JWT_AUDIENCE: z.string().min(1).default('petsystem-web'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  /** Origens web permitidas (CORS), separadas por vírgula. Vazio = CORS desligado. */
  CORS_ORIGINS: z.string().default(''),
  /** Ligue atrás de um proxy reverso para o rate limit ver o IP real. */
  TRUST_PROXY: bool('false'),
  /** Requisições por minuto por IP: geral e nas rotas de autenticação. */
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(240),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().positive().default(10),
  /** Restaura a loja de demonstração todo dia às 4h (horário de Brasília). */
  DEMO_DAILY_RESET: bool('true'),
  /** Fuso usado para agrupar vendas por dia nos relatórios. */
  SHOP_TIMEZONE: z.preprocess(emptyToUndefined, z.string().default('America/Sao_Paulo')),
});

export type Env = z.infer<typeof envSchema>;

export const ENV = Symbol('ENV');

/** Valida o ambiente. A mensagem de erro lista só os NOMES das variáveis, nunca os valores. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Ambiente inválido: ${problems}`);
  }
  return result.data;
}

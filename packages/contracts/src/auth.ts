import { z } from 'zod';

import { requiredText } from './common.js';

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
/** Senha: 8 a 128 caracteres (o limite superior evita hash caro de propósito). */
const password = z.string().min(8, 'mínimo de 8 caracteres').max(128);

export const signupSchema = z.object({
  shopName: requiredText(80),
  name: requiredText(80),
  email,
  password,
  /** Preenche a loja nova com produtos, clientes e vendas de exemplo. */
  withSampleData: z.boolean().default(true),
});
export type SignupInput = z.input<typeof signupSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(10).max(200) });

export type AuthTokens = { accessToken: string; refreshToken: string; expiresIn: number };

export type Me = {
  user: { id: string; name: string; email: string };
  shop: { id: string; name: string; isDemo: boolean };
};

export type AuthResponse = AuthTokens & Me;

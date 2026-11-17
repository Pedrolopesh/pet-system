import argon2 from 'argon2';

// Parâmetros recomendados pela OWASP para argon2id (19 MiB, 2 iterações).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Hash de uma senha que ninguém sabe: usado quando o e-mail não existe, para o login levar o mesmo
 * tempo com ou sem conta (não revela quais e-mails estão cadastrados).
 */
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummy ??= argon2.hash(`dummy-${Math.random()}`, OPTIONS);
  return dummy;
}

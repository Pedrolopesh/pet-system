import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthResponse } from '@petsystem/contracts';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { Clock } from '../src/common/clock.js';
import { type Mail, Mailer } from '../src/common/mailer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

export class TestClock extends Clock {
  constructor(private current: Date) {
    super();
  }
  now(): Date {
    return this.current;
  }
  set(iso: string): void {
    this.current = new Date(iso);
  }
}

/** E-mail capturado pelo teste (nada é enviado de verdade). */
export class FakeMailer extends Mailer {
  readonly sent: Mail[] = [];
  send(message: Mail): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
  lastCode(to: string): string | undefined {
    return [...this.sent]
      .reverse()
      .find((m) => m.to === to)
      ?.text.match(/é (\d{6})\./)?.[1];
  }
}

export type Ctx = {
  app: INestApplication;
  prisma: PrismaService;
  clock: TestClock;
  mailer: FakeMailer;
  http: () => ReturnType<typeof request>;
};

// Meio-dia de uma terça em Brasília
export const NOW = '2026-11-10T15:00:00Z';

export async function createTestApp(): Promise<Ctx> {
  const clock = new TestClock(new Date(NOW));
  const mailer = new FakeMailer();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(Mailer)
    .useValue(mailer)
    .compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  setupApp(app);
  await app.init();
  return {
    app,
    clock,
    mailer,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
  };
}

/** Senhas falsas usadas só nos testes. */
export const PASSWORD = 'senha-forte-123'; // scan-allow: fake gitleaks:allow
export const OTHER_PASSWORD = 'outra-senha-1'; // scan-allow: fake

export const uniqueEmail = (prefix = 'dono'): string => `${prefix}-${randomUUID()}@exemplo.com`;

/** Cria uma loja nova e devolve a sessão. */
export async function signup(ctx: Ctx, withSampleData = false): Promise<AuthResponse> {
  const res = await ctx
    .http()
    .post('/v1/auth/signup')
    .send({
      shopName: 'Loja Teste',
      name: 'Dona',
      email: uniqueEmail(),
      password: PASSWORD,
      withSampleData,
    }) // scan-allow: fake
    .expect(201);
  return res.body as AuthResponse;
}

export const bearer = (session: { accessToken: string }): [string, string] => [
  'Authorization',
  `Bearer ${session.accessToken}`,
];

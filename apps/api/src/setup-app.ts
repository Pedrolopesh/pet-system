import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { ENV, type Env } from './config/env.js';

/** Configuração compartilhada pela API real e pelos testes e2e. */
export function setupApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  const env = app.get<Env>(ENV);

  // Atrás de um proxy reverso, confia no primeiro salto para o rate limit ver o IP real.
  if (env.TRUST_PROXY) (app as NestExpressApplication).set('trust proxy', 1);
  (app as NestExpressApplication).disable('x-powered-by');
  app.use(helmet());

  // CORS só para uma lista explícita; sem lista, nenhuma origem web é aceita.
  const origins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) app.enableCors({ origin: origins, credentials: false, maxAge: 600 });

  app.setGlobalPrefix('v1', { exclude: ['health'] });
}

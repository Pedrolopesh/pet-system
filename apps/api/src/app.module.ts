import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Logger, LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { ENV, type Env } from './config/env.js';
import { CoreModule } from './core.module.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { HealthModule } from './modules/health/health.controller.js';
import { MaintenanceModule } from './modules/maintenance.module.js';
import { NotesModule } from './modules/notes/notes.controller.js';
import { PeopleModule } from './modules/people/people.module.js';
import { ReportsModule } from './modules/reports/reports.controller.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

@Module({
  imports: [
    CoreModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    // Dois limites por IP e por minuto: um geral e, só nas rotas de autenticação, um mais rígido.
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [
          { name: 'default', ttl: 60_000, limit: env.THROTTLE_LIMIT },
          {
            name: 'auth',
            ttl: 60_000,
            limit: env.THROTTLE_AUTH_LIMIT,
            skipIf: (context) => context.getClass() !== AuthController,
          },
        ],
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: (req, res) => {
            const header = req.headers['x-request-id'];
            const id =
              typeof header === 'string' && REQUEST_ID.test(header) ? header : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          // Só metadados: o corpo da requisição nunca vai para o log.
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url.split('?')[0],
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              '*.password',
              '*.refreshToken',
              '*.accessToken',
              '*.email',
            ],
            censor: '[REDACTED]',
          },
          ...(env.NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
    AuthModule,
    CatalogModule,
    PeopleModule,
    SalesModule,
    NotesModule,
    ReportsModule,
    HealthModule,
    MaintenanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_FILTER,
      inject: [Logger],
      useFactory: (logger: Logger) => new AllExceptionsFilter(logger),
    },
  ],
})
export class AppModule {}

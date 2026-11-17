import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { CoreModule } from '../src/core.module.js';
import { DemoModule } from '../src/modules/demo/demo.module.js';
import { DemoService } from '../src/modules/demo/demo.service.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';

try {
  process.loadEnvFile('.env');
} catch {
  // sem .env: variáveis vêm do ambiente
}

/** Só o necessário para criar a loja demo (sem HTTP, guards nem rotinas). */
@Module({ imports: [CoreModule, PrismaModule, DemoModule] })
class SeedModule {}

/** Garante a loja de demonstração (idempotente). */
const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
await app.get(DemoService).ensureDemoUser();
await app.close();

import { Controller, Get, Inject, Module } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../../common/public.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check(): Promise<{ status: 'ok'; db: 'ok' }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}

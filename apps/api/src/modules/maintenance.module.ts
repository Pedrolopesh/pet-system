import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module.js';
import { TokensService } from './auth/tokens.service.js';

/** Rotinas de limpeza: refresh tokens vencidos saem do banco uma vez por dia. */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  constructor(@Inject(TokensService) private readonly tokens: TokensService) {}

  @Cron('30 4 * * *', { timeZone: 'America/Sao_Paulo' })
  async purgeTokens(): Promise<void> {
    const count = await this.tokens.purgeExpired();
    this.logger.log(`Refresh tokens vencidos removidos: ${count}`);
  }
}

@Module({ imports: [AuthModule], providers: [MaintenanceService] })
export class MaintenanceModule {}

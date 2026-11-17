import { Global, Module } from '@nestjs/common';

import { Clock, SystemClock } from './common/clock.js';
import { Mailer, ResendMailer } from './common/mailer.js';
import { ENV, loadEnv } from './config/env.js';

@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: () => loadEnv() },
    { provide: Clock, useClass: SystemClock },
    { provide: Mailer, useClass: ResendMailer },
  ],
  exports: [ENV, Clock, Mailer],
})
export class CoreModule {}

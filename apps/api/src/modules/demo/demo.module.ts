import { Module } from '@nestjs/common';

import { DemoService } from './demo.service.js';
import { SampleDataService } from './sample-data.service.js';

@Module({ providers: [DemoService, SampleDataService], exports: [DemoService, SampleDataService] })
export class DemoModule {}

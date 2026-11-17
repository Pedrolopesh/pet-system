import { Module } from '@nestjs/common';

import { ClientsService } from './clients.service.js';
import { EmployeesService } from './employees.service.js';
import { ClientsController, EmployeesController } from './people.controller.js';

@Module({
  controllers: [ClientsController, EmployeesController],
  providers: [ClientsService, EmployeesService],
})
export class PeopleModule {}

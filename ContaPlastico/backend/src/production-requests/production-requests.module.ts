import { Module } from '@nestjs/common';
import { ProductionRequestsController } from './production-requests.controller';
import { ProductionRequestsService } from './production-requests.service';

@Module({
  controllers: [ProductionRequestsController],
  providers: [ProductionRequestsService],
})
export class ProductionRequestsModule {}

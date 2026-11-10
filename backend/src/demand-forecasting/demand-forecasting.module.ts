import { Module } from '@nestjs/common';
import { DemandForecastingController } from './demand-forecasting.controller';
import { DemandForecastingService } from './demand-forecasting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DemandForecastingController],
  providers: [DemandForecastingService],
  exports: [DemandForecastingService],
})
export class DemandForecastingModule {}

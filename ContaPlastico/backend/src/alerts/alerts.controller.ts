import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar alertas activas de stock bajo' })
  findActive() {
    return this.alertsService.findActive();
  }

  @Post('refresh')
  @Roles('ADMIN', 'ALMACEN')
  @ApiOperation({ summary: 'Actualizar manualmente las alertas de stock' })
  refresh() {
    return this.alertsService.refreshAlerts();
  }
}

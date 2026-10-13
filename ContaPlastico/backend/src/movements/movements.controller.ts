import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MovementsService } from './movements.service';

@ApiTags('movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly service: MovementsService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar historial de movimientos de inventario' })
  @ApiQuery({ name: 'materialId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: MovementType })
  @ApiQuery({ name: 'from', required: false, description: 'Fecha ISO inicial' })
  @ApiQuery({ name: 'to', required: false, description: 'Fecha ISO final' })
  findAll(
    @Query('materialId') materialId?: string,
    @Query('type') type?: MovementType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ materialId, type, from, to });
  }
}

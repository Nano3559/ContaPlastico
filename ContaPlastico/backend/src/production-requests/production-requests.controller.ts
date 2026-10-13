import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductionRequestDto } from './dto/create-production-request.dto';
import { ProductionRequestsService } from './production-requests.service';

@ApiTags('production-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production-requests')
export class ProductionRequestsController {
  constructor(private readonly service: ProductionRequestsService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Crear solicitud de materiales para produccion' })
  create(@Body() body: CreateProductionRequestDto, @Req() request: { user: { id: string } }) {
    return this.service.create(body, request.user.id);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'ALMACEN')
  @ApiOperation({ summary: 'Aprobar y despachar materiales de una solicitud' })
  approve(@Param('id') id: string, @Req() request: { user: { id: string } }) {
    return this.service.approve(id, request.user.id);
  }
}

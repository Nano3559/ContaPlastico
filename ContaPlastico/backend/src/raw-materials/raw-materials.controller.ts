import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MaterialType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { RawMaterialsService } from './raw-materials.service';

@ApiTags('raw-materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('raw-materials')
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar materias primas e inventario' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false, enum: MaterialType })
  @ApiQuery({ name: 'minStockAlert', required: false, type: Boolean })
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: MaterialType,
    @Query('minStockAlert') minStockAlert?: string,
  ) {
    return this.rawMaterialsService.findAll({
      search,
      type,
      minStockAlert: minStockAlert === 'true',
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  findOne(@Param('id') id: string) {
    return this.rawMaterialsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'ALMACEN')
  create(@Body() body: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ALMACEN')
  update(@Param('id') id: string, @Body() body: UpdateRawMaterialDto) {
    return this.rawMaterialsService.update(id, body);
  }

  @Patch(':id/stock')
  @Roles('ADMIN', 'ALMACEN')
  updateStock(@Param('id') id: string, @Body() body: UpdateRawMaterialDto) {
    return this.rawMaterialsService.update(id, { currentStockKg: body.currentStockKg });
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.rawMaterialsService.remove(id);
  }
}

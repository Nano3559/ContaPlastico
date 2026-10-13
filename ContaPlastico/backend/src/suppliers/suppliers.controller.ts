import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('ADMIN', 'ALMACEN')
  @ApiOperation({ summary: 'Crear proveedor' })
  create(@Body() body: CreateSupplierDto) { return this.service.create(body); }

  @Patch(':id')
  @Roles('ADMIN', 'ALMACEN')
  update(@Param('id') id: string, @Body() body: UpdateSupplierDto) { return this.service.update(id, body); }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
